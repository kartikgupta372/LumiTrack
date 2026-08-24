/**
 * simulation/simState.js — 3D Virtual Environment Simulation State Engine
 *
 * ARCHITECTURE BOUNDARY:
 * ─────────────────────────────────────────────────────────────────────────────
 * The frontend owns the virtual 3D world state and spatial geometry calculations.
 * The backend owns closed-loop tracking & control decisions (PID, Kalman, YOLO/OpenCV).
 *
 * This module manages the structured simulation state separating:
 *   1. Raw Simulation State (Source, Target, Environment, Metadata)
 *   2. Derived Spatial Geometry (Vectors, Bearings, Pointing Error, FOV Status)
 */

import {
  vectorSubtract,
  vectorLength,
  vectorNormalize,
  computeBoresightVector,
  computeBearingAngles,
  computeAngularErrorDeg,
  checkIsTargetInFOV,
} from './geometry';

/**
 * Creates a clean default Raw Simulation State object.
 * @returns {object} Raw simulation state
 */
export function createDefaultRawState() {
  return {
    timestamp: 0.0,
    frameIndex: 0,
    source: {
      worldPosition: [0, 1.65, 0],
      pan: 0.0,
      tilt: 0.0,
      panRate: 0.0,
      tiltRate: 0.0,
      fov: {
        fovX: 60.0,         // horizontal FOV degrees
        fovY: 45.0,         // vertical FOV degrees
        frameWidth: 640,    // px
        frameHeight: 480,   // px
        maxPanRate: 90.0,   // deg/s
        maxTiltRate: 90.0,  // deg/s
      },
    },
    target: {
      worldPosition: [0.0, 6.0, 18.0],
      velocity: [0.0, 0.0, 0.0],
      trajectoryState: {
        type: 'circular',
        time: 0.0,
        radius: 20.0,
        frequency: 0.2,
        speed: 6.0,
      },
      dimensions: {
        sizeRadiusPx: 8.0,
        physicalRadiusM: 0.5,
      },
    },
    environment: {
      noise: 0.0,
      vibration: 0.0,
      turbulence: 0.0,
      blur: 0.0,
      occlusion: false,
      occlusionDurationS: 2.0,
    },
  };
}

/**
 * Computes pure derived spatial geometry from raw simulation state.
 *
 * @param {object} rawState - Raw simulation state
 * @returns {object} Derived geometry representation
 */
export function computeDerivedGeometry(rawState) {
  const cameraPos = rawState.source.worldPosition;
  const targetPos = rawState.target.worldPosition;

  // Relative displacement vector: r = P_target - P_camera
  const relativeVector = vectorSubtract(targetPos, cameraPos);

  // Euclidean source-target distance: d = ||r||
  const distance = vectorLength(relativeVector);

  // Unit Line-Of-Sight (LOS) vector from camera to target
  const targetLOSVector = vectorNormalize(relativeVector);

  // Spherical bearing angles to target (azimuth/pan & elevation/tilt)
  const bearings = computeBearingAngles(relativeVector);

  // Camera current optical center pointing unit vector (boresight)
  const pointingDirection = computeBoresightVector(
    rawState.source.pan,
    rawState.source.tilt
  );

  // Off-axis angular pointing error in degrees
  const pointingErrorDeg = computeAngularErrorDeg(pointingDirection, targetLOSVector);

  // Pure geometric check if target is inside camera FOV frustum
  const isTargetInFOV = checkIsTargetInFOV(
    bearings.panDeg,
    bearings.tiltDeg,
    rawState.source.pan,
    rawState.source.tilt,
    rawState.source.fov.fovX,
    rawState.source.fov.fovY
  );

  return {
    relativeVector,
    distance,
    horizontalBearing: bearings.panDeg,
    verticalBearing: bearings.tiltDeg,
    pointingDirection,
    targetLOSVector,
    pointingErrorDeg,
    isTargetInFOV,
  };
}

/**
 * Constructs a complete VirtualWorldState containing raw state and derived geometry.
 *
 * @param {object} [rawOverrides={}] - Optional raw state overrides
 * @returns {object} VirtualWorldState
 */
export function createVirtualWorldState(rawOverrides = {}) {
  const defaultRaw = createDefaultRawState();
  const raw = {
    ...defaultRaw,
    ...rawOverrides,
    source: { ...defaultRaw.source, ...(rawOverrides.source || {}) },
    target: { ...defaultRaw.target, ...(rawOverrides.target || {}) },
    environment: { ...defaultRaw.environment, ...(rawOverrides.environment || {}) },
  };

  const derived = computeDerivedGeometry(raw);

  return {
    raw,
    derived,
  };
}

/**
 * Updates a VirtualWorldState given incoming WebSocket telemetry or local updates.
 *
 * @param {object} currentState - Existing VirtualWorldState
 * @param {object} telemetry - WebSocket telemetry payload from backend
 * @param {object} [scenarioConfig=null] - Scenario configuration from backend
 * @returns {object} Updated VirtualWorldState
 */
export function updateStateFromTelemetry(currentState, telemetry, scenarioConfig = null) {
  if (!telemetry) return currentState;

  // Map beacon world coordinates (backend: 100m range, 2D focal plane (x,y))
  const beaconX = (telemetry.beacon_world?.x ?? 0) * 0.35;
  const beaconY = (telemetry.beacon_world?.y ?? 0) * 0.35;
  const beaconVx = (telemetry.beacon_world?.vx ?? 0) * 0.35;
  const beaconVy = (telemetry.beacon_world?.vy ?? 0) * 0.35;

  const newTargetPos = [beaconX, 6.0 + beaconY, 18.0];
  const newTargetVel = [beaconVx, beaconVy, 0.0];

  const pan = telemetry.camera?.pan ?? currentState.raw.source.pan;
  const tilt = telemetry.camera?.tilt ?? currentState.raw.source.tilt;
  const panRate = telemetry.camera?.pan_rate ?? currentState.raw.source.panRate;
  const tiltRate = telemetry.camera?.tilt_rate ?? currentState.raw.source.tiltRate;

  // Build updated raw state
  const updatedRaw = {
    ...currentState.raw,
    timestamp: telemetry.timestamp ?? currentState.raw.timestamp,
    frameIndex: telemetry.frame_index ?? currentState.raw.frameIndex,
    source: {
      ...currentState.raw.source,
      pan,
      tilt,
      panRate,
      tiltRate,
      fov: scenarioConfig?.camera
        ? {
            fovX: scenarioConfig.camera.fov_x ?? 60.0,
            fovY: scenarioConfig.camera.fov_y ?? 45.0,
            frameWidth: scenarioConfig.camera.frame_width ?? 640,
            frameHeight: scenarioConfig.camera.frame_height ?? 480,
            maxPanRate: scenarioConfig.camera.max_pan_rate ?? 90.0,
            maxTiltRate: scenarioConfig.camera.max_tilt_rate ?? 90.0,
          }
        : currentState.raw.source.fov,
    },
    target: {
      ...currentState.raw.target,
      worldPosition: newTargetPos,
      velocity: newTargetVel,
      trajectoryState: scenarioConfig?.target
        ? {
            type: scenarioConfig.target.trajectory ?? 'circular',
            time: telemetry.timestamp ?? 0.0,
            radius: scenarioConfig.target.radius ?? 20.0,
            frequency: scenarioConfig.target.frequency ?? 0.2,
            speed: scenarioConfig.target.speed ?? 6.0,
          }
        : currentState.raw.target.trajectoryState,
    },
    environment: scenarioConfig?.disturbances
      ? {
          noise: scenarioConfig.disturbances.noise ?? 0.0,
          vibration: scenarioConfig.disturbances.vibration ?? 0.0,
          turbulence: scenarioConfig.disturbances.turbulence ?? 0.0,
          blur: scenarioConfig.disturbances.blur ?? 0.0,
          occlusion: scenarioConfig.disturbances.occlusion ?? false,
          occlusionDurationS: scenarioConfig.disturbances.occlusion_duration_s ?? 2.0,
        }
      : currentState.raw.environment,
  };

  // Re-compute derived geometry
  const updatedDerived = computeDerivedGeometry(updatedRaw);

  return {
    raw: updatedRaw,
    derived: updatedDerived,
  };
}

/**
 * Serializes VirtualWorldState to a JSON-compatible object for network transmission / logging.
 *
 * @param {object} state - VirtualWorldState
 * @returns {object} Plain serializable object
 */
export function serializeSimulationState(state) {
  return JSON.parse(JSON.stringify(state));
}

/**
 * Deserializes JSON representation back into VirtualWorldState.
 *
 * @param {object|string} data - Serialized JSON data
 * @returns {object} Reconstructed VirtualWorldState with derived geometry
 */
export function deserializeSimulationState(data) {
  const parsed = typeof data === 'string' ? JSON.parse(data) : data;
  const raw = parsed.raw || parsed;
  return createVirtualWorldState(raw);
}
