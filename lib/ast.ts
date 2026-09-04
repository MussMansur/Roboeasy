export function buildScratchAST(commands: any[]) {
  const blocks: Record<string, any> = {}
  
  let prevId: string | null = null
  const generateId = () => Math.random().toString(36).substring(2, 10)
  
  // Start block
  const startId = generateId()
  blocks[startId] = {
    opcode: 'flipperevents_whenProgramStarts',
    next: null, parent: null, inputs: {}, fields: {},
    shadow: false, topLevel: true, x: -130, y: 120
  }
  prevId = startId
  
  for (const cmd of commands) {
    const id = generateId()
    blocks[prevId].next = id
    
    const block = {
      opcode: '',
      next: null,
      parent: prevId,
      inputs: {} as any,
      fields: {} as any,
      shadow: false,
      topLevel: false
    }
    
    if (cmd.type === 'move') {
      block.opcode = 'flippermove_move'
      const dirId = generateId()
      block.inputs = {
        DIRECTION: [1, dirId],
        VALUE: [1, [4, (cmd.value || 10).toString()]]
      }
      block.fields = { UNIT: [cmd.unit || 'cm', null] }
      
      blocks[dirId] = {
        opcode: 'flippermove_custom-icon-direction',
        next: null, parent: id, inputs: {},
        fields: { 'field_flippermove_custom-icon-direction': [cmd.direction || 'forward', null] },
        shadow: true, topLevel: false
      }
    } else if (cmd.type === 'light_image') {
      block.opcode = 'flipperlight_lightDisplayImageOnForTime'
      const matrixId = generateId()
      block.inputs = {
        MATRIX: [1, matrixId],
        VALUE: [1, [4, (cmd.duration || 2).toString()]]
      }
      blocks[matrixId] = {
        opcode: 'flipperlight_matrix-5x5-brightness-image',
        next: null, parent: id, inputs: {},
        fields: { 'field_flipperlight_matrix-5x5-brightness-image': [cmd.image || '9909999099000009000909990', null] },
        shadow: true, topLevel: false
      }
    } else if (cmd.type === 'light_text') {
      block.opcode = 'flipperlight_lightDisplayText'
      block.inputs = { TEXT: [1, [10, (cmd.text || 'Hi').toString()]] }
    } else if (cmd.type === 'wait') {
      block.opcode = 'control_wait'
      block.inputs = { DURATION: [1, [5, (cmd.duration || 1).toString()]] }
    } else if (cmd.type === 'sound') {
      block.opcode = 'flippersound_playSoundUntilDone'
      const soundId = generateId()
      block.inputs = { SOUND: [1, soundId] }
      blocks[soundId] = {
        opcode: 'flippersound_sound-selector',
        next: null, parent: id, inputs: {},
        fields: { 'field_flippersound_sound-selector': ['{"name":"Cat Meow 1","location":"device"}', null] },
        shadow: true, topLevel: false
      }
    } else if (cmd.type === 'motor') {
      block.opcode = 'flippermotor_motorTurnForDirection'
      const portId = generateId()
      const dirId = generateId()
      block.inputs = {
        PORT: [1, portId],
        DIRECTION: [1, dirId],
        VALUE: [1, [4, (cmd.value || 1).toString()]]
      }
      block.fields = { UNIT: [cmd.unit || 'rotations', null] }
      
      blocks[portId] = {
        opcode: 'flippermotor_multiple-port-selector',
        next: null, parent: id, inputs: {},
        fields: { 'field_flippermotor_multiple-port-selector': [cmd.port || 'A', null] },
        shadow: true, topLevel: false
      }
      blocks[dirId] = {
        opcode: 'flippermotor_custom-icon-direction',
        next: null, parent: id, inputs: {},
        fields: { 'field_flippermotor_custom-icon-direction': [cmd.direction || 'clockwise', null] },
        shadow: true, topLevel: false
      }
    }
    
    blocks[id] = block
    prevId = id
  }
  
  return blocks
}
