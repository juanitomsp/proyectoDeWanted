import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();

    if (!image) {
      throw new Error('No image provided');
    }

    console.log('Processing delivery note OCR...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini-2025-08-07',
        response_format: { type: "json_object" },
        messages: [
          {
            role: 'system',
            content: `Extrae información de albaranes de entrega y devuélvela en JSON.

Formato de salida:
{
  "supplier": "nombre del proveedor",
  "date": "YYYY-MM-DD",
  "products": [
    {"name": "nombre producto", "quantity": número, "unit": "kg/L/uds/g"}
  ]
}

Reglas:
- Extrae TODOS los productos de la tabla
- Separa cantidad y unidad (ej: "500 g" → quantity: 500, unit: "g")
- Si no encuentras supplier o date, usa null
- Si no hay productos, devuelve array vacío`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extrae los datos de este albarán:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: image
                }
              }
            ]
          }
        ],
        max_completion_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenAI full response:', JSON.stringify(data, null, 2));
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid OpenAI response structure:', data);
      throw new Error('Invalid response structure from OpenAI');
    }
    
    const content = data.choices[0].message.content;
    console.log('OCR raw content:', content);

    if (!content || content.trim() === '') {
      console.error('Empty content from OpenAI');
      throw new Error('OpenAI returned empty content');
    }

    // Parse JSON from response
    let parsedData;
    try {
      parsedData = JSON.parse(content.trim());
      console.log('Parsed OCR data:', JSON.stringify(parsedData, null, 2));
      
      // Validate the response structure
      if (parsedData.error) {
        throw new Error(parsedData.error);
      }
      
      if (!parsedData.products || !Array.isArray(parsedData.products)) {
        console.warn('No products array found, creating empty array');
        parsedData.products = [];
      }
      
    } catch (e) {
      console.error('Failed to parse JSON:', content);
      console.error('Parse error:', e);
      throw new Error('Invalid JSON response from OCR: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }

    return new Response(JSON.stringify(parsedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in OCR function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
