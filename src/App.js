import React, { useState } from "react";
import { Stage, Layer, Line } from "react-konva";
import {Button, Slider} from "@mui/material";

const App = () => {
    const MM_TO_PX = 3.78; // Коэффициент перевода из мм в пиксели
    const [verticalLineColor, setVerticalLineColor] = useState("#000000"); // Состояние для хранения цвета линии
    const [horizontalLineColor, setHorizontalLineColor] = useState("#000000"); // Состояние для хранения цвета линии
    const [canvasSizeMM, setCanvasSizeMM] = useState({ width: 210, height: 297 }); // Размеры в мм
    const [marginMM, setMarginMM] = useState(10); // Отступы от краёв в мм
    const [lineSpacingXMM, setLineSpacingXMM] = useState(10); // Шаг горизонтальных линий в мм
    const [lineSpacingYMM, setLineSpacingYMM] = useState(5); // Отступ между группами горизонтальных линий в мм
    const [verticalSpacingMM, setVerticalSpacingMM] = useState(5); // Шаг вертикальных линий в мм
    const [verticalAngle, setVerticalAngle] = useState(0); // Угол наклона вертикальных линий

    // Перевод размеров из мм в пиксели
    const canvasSize = {
        width: canvasSizeMM.width * MM_TO_PX,
        height: canvasSizeMM.height * MM_TO_PX,
    };
    const margin = marginMM * MM_TO_PX;
    const lineSpacingX = lineSpacingXMM * MM_TO_PX;
    const lineSpacingY = lineSpacingYMM * MM_TO_PX;
    const verticalSpacing = verticalSpacingMM * MM_TO_PX;

    const stageRef = React.useRef(null); // Ссылка на Stage

    // Генерация горизонтальных линий
    const generateHorizontalLines = () => {
        const lines = [];
        let currentY = margin;

        while (currentY <= canvasSize.height - margin) {
            // Первая линия в группе
            lines.push(<Line key={`hline-${currentY}`} points={[margin, currentY, canvasSize.width - margin, currentY]} stroke={horizontalLineColor} strokeWidth={1} />);
            currentY += lineSpacingX;

            // Вторая линия в группе (если помещается)
            if (currentY <= canvasSize.height - margin) {
                lines.push(<Line key={`hline-${currentY}`} points={[margin, currentY, canvasSize.width - margin, currentY]} stroke={horizontalLineColor} strokeWidth={1} />);
                currentY += lineSpacingY; // Отступ после группы
            }
        }

        return lines;
    };

    // Генерация вертикальных линий с учётом угла
    const generateVerticalLines = () => {
        const lines = [];
        const angleInRadians = (verticalAngle * Math.PI) / 180; // Угол в радианах
        const tanAngle = Math.tan(angleInRadians); // Тангенс угла наклона

        // Определяем высоту и ширину без учёта отступов
        const contentWidth = canvasSize.width - 2 * margin;
        const contentHeight = canvasSize.height - 2 * margin;

        let currentX = -contentHeight * Math.abs(tanAngle); // Начальная X-координата линии с учётом наклона

        // Генерация линий
        while (currentX <= contentWidth + contentHeight * Math.abs(tanAngle)) {
            // Линия без отсечения
            const startX = margin + currentX;
            const startY = margin;
            const endX = startX + contentHeight * tanAngle;
            const endY = canvasSize.height - margin;

            // Обрезаем линию по границам
            const clippedLine = clipLineToRect(startX, startY, endX, endY, margin, canvasSize.width - margin, margin, canvasSize.height - margin);

            if (clippedLine) {
                const [clippedX1, clippedY1, clippedX2, clippedY2] = clippedLine;
                lines.push(
                    <Line
                        key={`vline-${currentX}`}
                        points={[clippedX1, clippedY1, clippedX2, clippedY2]}
                        stroke={verticalLineColor}
                        strokeWidth={1}
                        dash={[2, 5]} // Длина штриха - 10 мм, длина пробела - 5 мм
                    />
                );
            }

            currentX += verticalSpacing; // Переход к следующей линии
        }

        return lines;
    };

    // Функция для обрезки линии по границам прямоугольника
    const clipLineToRect = (x1, y1, x2, y2, left, right, top, bottom) => {
        const outCode = (x, y) => {
            let code = 0;
            if (x < left) code |= 1; // Слева
            if (x > right) code |= 2; // Справа
            if (y < top) code |= 4; // Сверху
            if (y > bottom) code |= 8; // Снизу
            return code;
        };

        let outCode1 = outCode(x1, y1);
        let outCode2 = outCode(x2, y2);

        while (true) {
            if (!(outCode1 | outCode2)) {
                // Полностью внутри
                return [x1, y1, x2, y2];
            } else if (outCode1 & outCode2) {
                // Полностью снаружи
                return null;
            } else {
                let x, y;
                const outCodeOut = outCode1 ? outCode1 : outCode2;

                if (outCodeOut & 8) {
                    x = x1 + ((x2 - x1) * (bottom - y1)) / (y2 - y1);
                    y = bottom;
                } else if (outCodeOut & 4) {
                    x = x1 + ((x2 - x1) * (top - y1)) / (y2 - y1);
                    y = top;
                } else if (outCodeOut & 2) {
                    y = y1 + ((y2 - y1) * (right - x1)) / (x2 - x1);
                    x = right;
                } else if (outCodeOut & 1) {
                    y = y1 + ((y2 - y1) * (left - x1)) / (x2 - x1);
                    x = left;
                }

                if (outCodeOut === outCode1) {
                    x1 = x;
                    y1 = y;
                    outCode1 = outCode(x1, y1);
                } else {
                    x2 = x;
                    y2 = y;
                    outCode2 = outCode(x2, y2);
                }
            }
        }
    };

    const printDrawing = () => {
        const stage = stageRef.current;
        if (!stage) return;

        // Получаем URL изображения из канваса
        const dataURL = stage.toDataURL({ pixelRatio: 2 });

        // Создаём новое окно
        const newWindow = window.open("Grid Drawer");
        newWindow.document.title = "Grid Drawer";
        const img = newWindow.document.createElement("img");
        img.src = dataURL;
        img.style.width = "100%";

        // Дождаться загрузки изображения
        img.onload = () => {
            newWindow.document.body.appendChild(img);
            newWindow.print();
            newWindow.close(); // Закрыть окно после печати, если это нужно
        };
    };

    return (
        <div style={{padding: "20px"}}>
            <h1>Grid Drawer</h1>
            <Button onClick={printDrawing} style={{marginLeft: "10px"}}>
                Print
            </Button>
            <div style={{marginBottom: "20px"}}>
                <label>
                    Canvas Width (mm):
                    <input
                        type="number"
                        value={canvasSizeMM.width}
                        onChange={(e) => setCanvasSizeMM({...canvasSizeMM, width: Number(e.target.value)})}
                        min="50"
                    />
                </label>
                <label style={{marginLeft: "10px"}}>
                    Canvas Height (mm):
                    <input
                        type="number"
                        value={canvasSizeMM.height}
                        onChange={(e) => setCanvasSizeMM({...canvasSizeMM, height: Number(e.target.value)})}
                        min="50"
                    />
                </label>
                <label style={{marginLeft: "10px"}}>
                    Margin (mm):
                    <input
                        type="number"
                        value={marginMM}
                        onChange={(e) => setMarginMM(Number(e.target.value))}
                        min="0"
                        max="50"
                    />
                </label>
            </div>

            <div style={{marginBottom: "20px"}}>
                <label>
                    Horizontal Line Spacing X (mm):
                    <Slider value={lineSpacingXMM}
                            aria-label="Default"
                            valueLabelDisplay="auto"
                            min={1}
                            onChange={(e) => setLineSpacingXMM(Number(e.target.value))}
                    />
                </label>
                <label>
                    Horizontal Line Spacing Y (mm):
                    <Slider value={lineSpacingYMM}
                            aria-label="Default"
                            valueLabelDisplay="auto"
                            min={1}
                            onChange={(e) => setLineSpacingYMM(Number(e.target.value))}
                    />
                </label>
                <label>
                    Horizontal Line Color:
                    <input
                        type="color"
                        value={horizontalLineColor}
                        onChange={(e) => setHorizontalLineColor(e.target.value)} // Обновляем цвет
                    />
                </label>
                <br/>
                <label style={{marginLeft: "10px"}}>
                    Vertical Line Spacing (mm):
                    <input
                        type="number"
                        value={verticalSpacingMM}
                        onChange={(e) => setVerticalSpacingMM(Number(e.target.value))}
                        min="1"
                    />
                </label>
                <label style={{marginLeft: "10px"}}>
                    Vertical Line Angle (°):
                    <input
                        type="number"
                        value={verticalAngle}
                        onChange={(e) => setVerticalAngle(Number(e.target.value))}
                        min="-45"
                        max="45"
                    />
                </label>
                <label>
                    Vertical Line Color:
                    <input
                        type="color"
                        value={verticalLineColor}
                        onChange={(e) => setVerticalLineColor(e.target.value)} // Обновляем цвет
                    />
                </label>
            </div>

            <div style={{border: "1px solid black", display: "inline-block"}}>
                <Stage ref={stageRef} width={canvasSize.width} height={canvasSize.height}>
                    <Layer>
                        {generateHorizontalLines()}
                        {generateVerticalLines()}
                    </Layer>
                </Stage>
            </div>
        </div>
    );
};

export default App;

