/**
 * simulation/geometry.js — 3D Vector & Spherical Geometry Utilities for FSOC
 *
 * COORDINATE CONVENTIONS (LumiTrack Virtual Environment):
 * ─────────────────────────────────────────────────────────────────────────────
 * Origin [0, 0, 0] : Center of camera gimbal pedestal base
 * +X Axis          : Azimuth / Right (East). Positive pan rotates towards +X.
 * +Y Axis          : Elevation / Up (Vertical). Positive tilt rotates towards +Y.
 * +Z Axis          : Range / Forward (North). Default boresight points along +Z.
 *
 * ANGULAR CONVENTIONS:
 * Pan (θ)  : Rotation around Y-axis (degrees). 0° = +Z (Forward), +90° = +X (Right).
 * Tilt (φ) : Rotation around X-axis (degrees). 0° = Horizontal (+Z), +90° = Vertical Up (+Y).
 */

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/**
 * Converts degrees to radians.
 */
export function degToRad(deg) {
  return deg * DEG2RAD;
}

/**
 * Converts radians to degrees.
 */
export function radToDeg(rad) {
  return rad * RAD2DEG;
}

/**
 * Clamps a number between a min and max bound.
 */
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Computes 3D Euclidean vector magnitude (length).
 * @param {[number, number, number]} v
 * @returns {number}
 */
export function vectorLength(v) {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

/**
 * Normalizes a 3D vector to unit length.
 * @param {[number, number, number]} v
 * @returns {[number, number, number]}
 */
export function vectorNormalize(v) {
  const len = vectorLength(v);
  if (len < 1e-9) return [0, 0, 1];
  return [v[0] / len, v[1] / len, v[2] / len];
}

/**
 * Subtracts vector B from vector A (A - B).
 * @param {[number, number, number]} a
 * @param {[number, number, number]} b
 * @returns {[number, number, number]}
 */
export function vectorSubtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

/**
 * Adds vector B to vector A (A + B).
 * @param {[number, number, number]} a
 * @param {[number, number, number]} b
 * @returns {[number, number, number]}
 */
export function vectorAdd(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/**
 * Computes dot product of two 3D vectors.
 * @param {[number, number, number]} a
 * @param {[number, number, number]} b
 * @returns {number}
 */
export function vectorDot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Computes unit boresight direction vector given pan and tilt angles.
 * @param {number} panDeg - Pan angle in degrees
 * @param {number} tiltDeg - Tilt angle in degrees
 * @returns {[number, number, number]} Unit direction vector
 */
export function computeBoresightVector(panDeg, tiltDeg) {
  const panRad = degToRad(panDeg);
  const tiltRad = degToRad(tiltDeg);

  // x = sin(pan) * cos(tilt)
  // y = sin(tilt)
  // z = cos(pan) * cos(tilt)
  const cosTilt = Math.cos(tiltRad);
  const x = Math.sin(panRad) * cosTilt;
  const y = Math.sin(tiltRad);
  const z = Math.cos(panRad) * cosTilt;

  return vectorNormalize([x, y, z]);
}

/**
 * Computes spherical bearing angles (pan, tilt) from relative vector.
 * @param {[number, number, number]} relVec - Relative vector [dx, dy, dz]
 * @returns {{ panDeg: number, tiltDeg: number }} Bearing in degrees
 */
export function computeBearingAngles(relVec) {
  const [dx, dy, dz] = relVec;
  const distanceXZ = Math.sqrt(dx * dx + dz * dz);

  const panRad = Math.atan2(dx, dz < 1e-6 && Math.abs(dx) < 1e-6 ? 1e-6 : dz);
  const tiltRad = Math.atan2(dy, Math.max(distanceXZ, 1e-6));

  return {
    panDeg: radToDeg(panRad),
    tiltDeg: radToDeg(tiltRad),
  };
}

/**
 * Computes off-axis angular pointing error between boresight direction and target LOS.
 * @param {[number, number, number]} pointingVec - Camera unit pointing vector
 * @param {[number, number, number]} targetLOSVec - Target line-of-sight unit vector
 * @returns {number} Angle in degrees
 */
export function computeAngularErrorDeg(pointingVec, targetLOSVec) {
  const dot = clamp(vectorDot(pointingVec, targetLOSVec), -1.0, 1.0);
  const angleRad = Math.acos(dot);
  return radToDeg(angleRad);
}

/**
 * Geometrically checks if target is inside camera Field of View (FOV).
 * @param {number} targetPanDeg - Target bearing pan angle
 * @param {number} targetTiltDeg - Target bearing tilt angle
 * @param {number} cameraPanDeg - Current camera pan angle
 * @param {number} cameraTiltDeg - Current camera tilt angle
 * @param {number} fovXDeg - Horizontal FOV in degrees (e.g. 60°)
 * @param {number} fovYDeg - Vertical FOV in degrees (e.g. 45°)
 * @returns {boolean} True if target is geometrically inside FOV bounds
 */
export function checkIsTargetInFOV(
  targetPanDeg,
  targetTiltDeg,
  cameraPanDeg,
  cameraTiltDeg,
  fovXDeg = 60,
  fovYDeg = 45
) {
  const relPan = Math.abs(targetPanDeg - cameraPanDeg);
  const relTilt = Math.abs(targetTiltDeg - cameraTiltDeg);

  const halfFovX = fovXDeg / 2.0;
  const halfFovY = fovYDeg / 2.0;

  return relPan <= halfFovX && relTilt <= halfFovY;
}
