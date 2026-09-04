import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { buildScratchAST } from '@/lib/ast'

const BLOCKS_PROMPT = `You are an expert LEGO SPIKE Prime 3 Word Blocks programmer.
Generate a valid logic array for the Spike 3 hub.

Output ONLY a JSON object with exactly two keys:
{
  "description": "Short explanation in the user's language",
  "blocks": [
    { "type": "move", "direction": "forward", "value": 10, "unit": "cm" },
    { "type": "light_text", "text": "Hi" },
    { "type": "light_image", "image": "9909999099000009000909990", "duration": 2 },
    { "type": "wait", "duration": 1 },
    { "type": "sound" },
    { "type": "motor", "port": "A", "direction": "clockwise", "value": 1, "unit": "rotations" }
  ]
}

Available block types:
- move: move robot (direction: forward/backward, value: number, unit: cm/rotations/degrees/seconds)
- light_text: write text on matrix (text: string)
- light_image: display image (image: 25-char string of 0s and 9s, duration: seconds)
- wait: wait (duration: seconds)
- sound: play meow sound
- motor: turn single motor (port: A-F, direction: clockwise/counterclockwise, value: number, unit: rotations/degrees/seconds)

Rules:
- Generate 3-8 blocks maximum.
- Use ONLY the types listed above.
- No Markdown fences, pure JSON.`

const PYTHON_PROMPT = `You are an expert LEGO SPIKE Prime 3 Python programmer.
Generate a valid MicroPython script for the LEGO SPIKE Prime 3 hub based on the user's request.
CRITICAL: Spike 3 uses the new async architecture. You MUST wrap your code in an async main function and run it via runloop:
import runloop
from hub import ...

async def main():
    # your logic here

runloop.run(main())

Return your answer as a JSON object with exactly two keys:
{
  "code": "<the raw Python code as a string, using \\n for newlines>",
  "description": "<brief 2 sentence human-readable description in the requested language>"
}
Return ONLY the JSON, no markdown code fences, no extra text.`

export async function POST(req: NextRequest) {
  try {
    const { prompt, format } = await req.json()
    if (!prompt) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API key is not configured.' }, { status: 500 })
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const systemInstruction = format === 'python' ? PYTHON_PROMPT : BLOCKS_PROMPT
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2
      }
    })
    
    let payloadText = response.text || ''
    payloadText = payloadText.replace(/```json/g, '').replace(/```/g, '').trim()
    
    if (format === 'python') {
      const result = JSON.parse(payloadText)
      return NextResponse.json({ payload: result.code, description: result.description })
    } else {
      const result = JSON.parse(payloadText)
      const commands = result.blocks
      const description = result.description

      const scratchAST = {
        targets: [
          {
            isStage: true, name: 'Stage', variables: {}, lists: {}, broadcasts: {}, blocks: {}, comments: {}, currentCostume: 0,
            costumes: [{assetId: 'deadc057000000000000000000000000', name: 'backdrop1', bitmapResolution: 1, md5ext: 'deadc057000000000000000000000000.svg', dataFormat: 'svg', rotationCenterX: 47, rotationCenterY: 55}],
            sounds: [], volume: 0, tempo: 60, videoTransparency: 50, videoState: 'on', textToSpeechLanguage: null
          },
          {
            isStage: false, name: '6cwEZ2L7lhdcJv6kM7Mw', variables: {}, lists: {}, broadcasts: {},
            blocks: buildScratchAST(commands),
            comments: {}, currentCostume: 0,
            costumes: [{assetId: 'deadc057000000000000000000000000', name: 'N6', bitmapResolution: 1, md5ext: 'deadc057000000000000000000000000.svg', dataFormat: 'svg', rotationCenterX: 240, rotationCenterY: 180}],
            sounds: [{assetId: '1b8b032b06360a6cf7c31d86bddd144b', name: 'Cat Meow 1', dataFormat: 'wav', rate: 48000, sampleCount: 60000, md5ext: '1b8b032b06360a6cf7c31d86bddd144b.wav'}],
            volume: 100, visible: true, x: 0, y: 0, size: 100, direction: 90, draggable: false, rotationStyle: 'all around'
          }
        ],
        monitors: [],
        extensions: ['flipperevents', 'flippermovement', 'flippermotor', 'flipperlight', 'flippersound', 'flippercontrol'],
        meta: { semver: '3.0.0', vm: '0.2.0' }
      }
      
      return NextResponse.json({ payload: scratchAST, description })
    }
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 })
  }
}
