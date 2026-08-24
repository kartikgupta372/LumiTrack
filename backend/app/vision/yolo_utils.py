"""
YOLOv8 ONNX Detection Utilities for LumiTrack FSOC Beacon Detector.
Handles preprocessing, postprocessing and NMS.
"""
import numpy as np
import cv2
from typing import List, Tuple, Optional


def letterbox(
    image: np.ndarray,
    target_size: Tuple[int, int] = (640, 640),
    stride: int = 32,
    color: Tuple[int, int, int] = (114, 114, 114)
) -> Tuple[np.ndarray, float, Tuple[int, int]]:
    """
    Resize image to target with preserved aspect ratio (letterboxing).
    Returns (resized_img, scale_ratio, (pad_w, pad_h)).
    """
    h, w = image.shape[:2]
    th, tw = target_size

    r = min(th / h, tw / w)
    new_w, new_h = int(round(w * r)), int(round(h * r))
    resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_LINEAR)

    pad_w = (tw - new_w) / 2
    pad_h = (th - new_h) / 2
    top, bottom = int(round(pad_h - 0.1)), int(round(pad_h + 0.1))
    left, right = int(round(pad_w - 0.1)), int(round(pad_w + 0.1))

    padded = cv2.copyMakeBorder(resized, top, bottom, left, right, cv2.BORDER_CONSTANT, value=color)
    return padded, r, (pad_w, pad_h)


def preprocess(image: np.ndarray, input_size: int = 640) -> np.ndarray:
    """
    Preprocess image for YOLO inference:
    BGR -> RGB, letterbox resize, normalize [0,1], NCHW.
    """
    img, _, _ = letterbox(image, (input_size, input_size))
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = img.astype(np.float32) / 255.0
    img = np.transpose(img, (2, 0, 1))       # HWC -> CHW
    img = np.expand_dims(img, axis=0)        # CHW -> 1CHW
    return img


def xywh2xyxy(boxes: np.ndarray) -> np.ndarray:
    """Convert cx,cy,w,h to x1,y1,x2,y2."""
    out = np.copy(boxes)
    out[:, 0] = boxes[:, 0] - boxes[:, 2] / 2
    out[:, 1] = boxes[:, 1] - boxes[:, 3] / 2
    out[:, 2] = boxes[:, 0] + boxes[:, 2] / 2
    out[:, 3] = boxes[:, 1] + boxes[:, 3] / 2
    return out


def non_max_suppression(
    predictions: np.ndarray,
    conf_threshold: float = 0.4,
    iou_threshold: float = 0.45
) -> List[np.ndarray]:
    """
    Apply confidence thresholding and NMS on raw YOLO output tensor.
    Returns list of kept detections [x1,y1,x2,y2,conf,cls].
    """
    results = []
    # predictions shape: [1, num_anchors, 5+num_classes]
    preds = predictions[0]  # [num_anchors, 5+nc]

    # Filter by objectness confidence
    obj_conf = preds[:, 4]
    mask = obj_conf > conf_threshold
    preds = preds[mask]

    if len(preds) == 0:
        return results

    # Get class with highest score
    cls_conf = preds[:, 5:].max(axis=1)
    cls_id = preds[:, 5:].argmax(axis=1)
    scores = preds[:, 4] * cls_conf

    # Convert boxes to xyxy
    boxes = xywh2xyxy(preds[:, :4])

    # Apply OpenCV NMS per class
    kept_indices = cv2.dnn.NMSBoxes(
        bboxes=boxes.tolist(),
        scores=scores.tolist(),
        score_threshold=conf_threshold,
        nms_threshold=iou_threshold
    )

    if len(kept_indices) > 0:
        for i in kept_indices.flatten():
            det = np.array([boxes[i, 0], boxes[i, 1], boxes[i, 2], boxes[i, 3], scores[i], cls_id[i]])
            results.append(det)

    return results


def scale_coords(
    img1_shape: Tuple[int, int],
    coords: np.ndarray,
    img0_shape: Tuple[int, int],
    ratio_pad: Optional[Tuple] = None
) -> np.ndarray:
    """
    Rescale bounding box from inference-space back to original frame space.
    """
    if ratio_pad is None:
        gain = min(img1_shape[0] / img0_shape[0], img1_shape[1] / img0_shape[1])
        pad = (img1_shape[1] - img0_shape[1] * gain) / 2, (img1_shape[0] - img0_shape[0] * gain) / 2
    else:
        gain, pad = ratio_pad

    coords[0] = (coords[0] - pad[0]) / gain
    coords[1] = (coords[1] - pad[1]) / gain
    coords[2] = (coords[2] - pad[0]) / gain
    coords[3] = (coords[3] - pad[1]) / gain

    coords = np.clip(coords, 0, None)
    return coords
