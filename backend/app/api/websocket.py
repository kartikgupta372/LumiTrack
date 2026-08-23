import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..services.simulation_service import simulation_service


router = APIRouter()


@router.websocket("/ws/simulation")
async def simulation_websocket(websocket: WebSocket):
    await websocket.accept()

    try:
        while True:
            state = simulation_service.get_state()

            await websocket.send_json(
                state.model_dump()
            )

            await asyncio.sleep(0.1)

    except WebSocketDisconnect:
        print("WebSocket client disconnected")