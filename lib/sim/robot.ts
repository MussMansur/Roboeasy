/** Size of the virtual robot (zod-free, so the simulator can run in the browser without the schema code). */

/** Robot dimensions (a typical SPIKE Prime driving base, approximate). */
export const ROBOT_SHAPE = {
  /** Body length (forward) and width, mm; the wheel axle is at the centre. */
  length: 170,
  width: 130,
  /** Sensor positions in front of the axle, mm. */
  colorSensorAhead: 70,
  distanceSensorAhead: 85,
  bumperAhead: 85,
} as const
