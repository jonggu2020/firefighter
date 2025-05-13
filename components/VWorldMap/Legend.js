// src/components/Legend.js

import React, { useState, useRef, useEffect } from 'react';
// 범례 표시에 필요한 상수들을 mapConfig.js 에서 직접 가져옵니다.
import {
    soilColorMap,
    soilCodeDescriptions,
    imsangdoColorMap,
    imsangdoCodeDescriptions,
    hikingTrailLegend // 등산로 범례 정보
} from './mapConfig';

const Legend = ({
    visibleLegendTypes,         // 현재 표시되어야 할 범례 타입 배열 ['soil', 'imsangdo', ...]
    collapsedLegends,           // 범례 접힘 상태 객체 { soil: false, imsangdo: false }
    activeSoilCodeFilter,       // 활성화된 토양 코드 필터 배열
    activeImsangdoCodeFilter,   // 활성화된 임상도 코드 필터 배열
    onToggleLegendCollapse,     // 범례 접기/펴기 핸들러 함수
    onSoilLegendItemClick,      // 토양 범례 항목 클릭 핸들러 함수
    onShowAllSoilClick,         // 토양 '모두 표시' 클릭 핸들러 함수
    onImsangdoLegendItemClick,  // 임상도 범례 항목 클릭 핸들러 함수
    onShowAllImsangdoClick,     // 임상도 '모두 표시' 클릭 핸들러 함수
    // 아래 4개: 체크박스 관련 props
    logicalLayersConfig,
    layerVisibility,
    soilOpacity,
    imsangdoOpacity,
    hikingTrailOpacity,
    onToggleVisibility,
    onOpacityChange,
}) => {

    // 드래그 기능을 위한 상태 및 ref
    const legendRef = useRef(null);
    const [position, setPosition] = useState({ top: 100, left: 10 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // 드래그 시작 핸들러
    const handleMouseDown = (e) => {
        e.preventDefault();
        if (!legendRef.current) return;
        setIsDragging(true);
        const rect = legendRef.current.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - position.left,
            y: e.clientY - position.top
        });
    };

    // 마우스 이동, 해제 이벤트 등록
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            setPosition({ top: e.clientY - dragOffset.y, left: e.clientX - dragOffset.x });
        };
        const handleMouseUp = () => setIsDragging(false);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    // 스타일 객체는 이 컴포넌트 내에서 정의하거나 props로 받을 수 있습니다.
    // 여기서는 내부에서 정의하는 것으로 가정합니다.
    const legendContainerStyle = {
        position: 'absolute',
        top: 0,
        left: 0,
        transform: `translate(${position.left}px, ${position.top}px)`,
        willChange: 'transform',
        zIndex: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '5px',
        width: '250px',
        maxHeight: '75vh',
        overflowY: 'auto',
        fontSize: '12px',
        color: '#333',
        textAlign: 'left',
        pointerEvents: 'auto', // 범례 클릭 가능하도록
        cursor: isDragging ? 'grabbing' : 'default',
    };

    const colorSwatchStyle = {
        width: '20px',
        height: '20px',
        opacity: 0.8,
        border: '1px solid #333',
        marginRight: '10px',
        flexShrink: 0
    };

    // visibleLegendTypes가 없거나 비어있으면 범례 자체를 렌더링하지 않음 (불편하다고 생각함)
    // if (!visibleLegendTypes || visibleLegendTypes.length === 0) {
    //     return null;
    // }

    return (
        <div ref={legendRef} style={legendContainerStyle}>
            {/* 드래그 핸들바 */}
            <div
                onMouseDown={handleMouseDown}
                style={{ cursor: 'grab', userSelect: 'none', textAlign: 'center', marginBottom: '8px' }}
            >
                ☰
            </div>
            {/* 체크박스 + 슬라이더 영역 */}
            <div style={{ marginBottom: '15px' }}>
            <h4 style={{ marginBottom: '5px' }}>레이어 선택 및 투명도 조절</h4>
            {logicalLayersConfig.map(groupConfig => (
                <div key={groupConfig.name} style={{ marginBottom: '8px' }}>
                {/* 체크박스 */}
                <label style={{ marginRight: '10px' }}>
                    <input
                    type="checkbox"
                    checked={layerVisibility?.[groupConfig.name] || false}
                    onChange={() => onToggleVisibility(groupConfig.name)}
                    style={{ marginRight: '5px' }}
                    />
                    {groupConfig.name}
                </label>

                {/* 투명도 슬라이더 */}
                {layerVisibility?.[groupConfig.name] && groupConfig.type !== 'mountain_station_markers' && (
                    <div style={{ display: 'inline-block', marginLeft: '10px' }}>
                    <label htmlFor={`opacity-${groupConfig.type}`} style={{ marginRight: '5px', fontSize: '11px' }}>
                        투명도:
                    </label>
                    <input
                        id={`opacity-${groupConfig.type}`}
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={
                        groupConfig.type === 'soil'
                            ? soilOpacity
                            : groupConfig.type === 'imsangdo'
                            ? imsangdoOpacity
                            : hikingTrailOpacity
                        }
                        onChange={(event) => onOpacityChange(groupConfig.type, event)}
                        style={{ width: '100px', verticalAlign: 'middle' }}
                    />
                    <span style={{ marginLeft: '5px', fontSize: '11px' }}>
                        {(
                        groupConfig.type === 'soil'
                            ? soilOpacity
                            : groupConfig.type === 'imsangdo'
                            ? imsangdoOpacity
                            : hikingTrailOpacity
                        ).toFixed(2)}
                    </span>
                    </div>
                )}
                </div>
            ))}
            <div style={{ borderBottom: '1px solid #ccc', margin: '10px 0' }}></div>
            </div>

            <h4>범례</h4>

            {/* 토양 범례 섹션 */}
            {visibleLegendTypes.includes('soil') && (
                <div style={{ marginTop: (visibleLegendTypes.indexOf('soil') > 0 && visibleLegendTypes.length > 1) ? '10px' : '0' }}>
                    <h4
                        style={{ cursor: 'pointer', marginBottom: '5px' }}
                        onClick={() => onToggleLegendCollapse('soil')}
                    >
                        토양 범례 (클릭하여 필터) {collapsedLegends.soil ? '[보이기]' : '[숨기기]'}
                    </h4>
                    {!collapsedLegends.soil && (
                        <>
                            <div
                                style={{
                                    marginBottom: '10px', cursor: 'pointer',
                                    textDecoration: activeSoilCodeFilter.length === 0 ? 'underline' : 'none',
                                    fontWeight: activeSoilCodeFilter.length === 0 ? 'bold' : 'normal',
                                    padding: '2px 5px', borderRadius: '3px',
                                    backgroundColor: activeSoilCodeFilter.length === 0 ? '#eee' : 'transparent',
                                    display: 'inline-block' // 너비 자동 조절
                                }}
                                onClick={onShowAllSoilClick}
                            >
                                모두 표시
                            </div>
                            <div style={{ borderBottom: '1px solid #ccc', margin: '5px 0' }}></div>

                            {Object.keys(soilColorMap)
                                .sort((a, b) => { /* 정렬 로직 */
                                    const numA = parseInt(a, 10);
                                    const numB = parseInt(b, 10);
                                    if (!isNaN(numA) && !isNaN(numB)) { return numA - numB; }
                                    return a.localeCompare(b);
                                })
                                .map(code => (
                                    soilCodeDescriptions[code] && (
                                        <div
                                            key={'soil-' + code}
                                            style={{
                                                display: 'flex', alignItems: 'center', marginBottom: '5px', cursor: 'pointer',
                                                fontWeight: activeSoilCodeFilter.includes(code) ? 'bold' : 'normal',
                                                backgroundColor: activeSoilCodeFilter.includes(code) ? '#eee' : 'transparent',
                                                padding: '2px 5px', borderRadius: '3px',
                                            }}
                                            onClick={() => onSoilLegendItemClick(code)}
                                        >
                                            <div style={{ ...colorSwatchStyle, backgroundColor: soilColorMap[code] }}></div>
                                            <span><strong>{code}</strong> - {soilCodeDescriptions[code]}</span>
                                        </div>
                                    )
                                ))
                            }
                        </>
                    )}
                </div>
            )}

            {/* 임상도 범례 섹션 */}
            {visibleLegendTypes.includes('imsangdo') && (
                <div style={{ marginTop: (visibleLegendTypes.indexOf('imsangdo') > 0 && visibleLegendTypes.length > 1) ? '10px' : '0' }}>
                     <h4
                        style={{ cursor: 'pointer', marginBottom: '5px' }}
                        onClick={() => onToggleLegendCollapse('imsangdo')}
                    >
                        임상도 범례 (클릭하여 필터) {collapsedLegends.imsangdo ? '[보이기]' : '[숨기기]'}
                    </h4>
                    {!collapsedLegends.imsangdo && (
                        <>
                            <div
                                style={{
                                    marginBottom: '10px', cursor: 'pointer',
                                    textDecoration: activeImsangdoCodeFilter.length === 0 ? 'underline' : 'none',
                                    fontWeight: activeImsangdoCodeFilter.length === 0 ? 'bold' : 'normal',
                                    padding: '2px 5px', borderRadius: '3px',
                                    backgroundColor: activeImsangdoCodeFilter.length === 0 ? '#eee' : 'transparent',
                                    display: 'inline-block' // 너비 자동 조절
                                }}
                                onClick={onShowAllImsangdoClick}
                            >
                                모두 표시
                            </div>
                            <div style={{ borderBottom: '1px solid #ccc', margin: '5px 0' }}></div>
                            {Object.keys(imsangdoColorMap)
                                .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
                                .map(code => (
                                    imsangdoCodeDescriptions[code] && (
                                        <div
                                            key={'imsangdo-' + code}
                                            style={{
                                                display: 'flex', alignItems: 'center', marginBottom: '5px', cursor: 'pointer',
                                                fontWeight: activeImsangdoCodeFilter.includes(code) ? 'bold' : 'normal',
                                                backgroundColor: activeImsangdoCodeFilter.includes(code) ? '#eee' : 'transparent',
                                                padding: '2px 5px', borderRadius: '3px',
                                            }}
                                            onClick={() => onImsangdoLegendItemClick(code)}
                                        >
                                            <div style={{ ...colorSwatchStyle, backgroundColor: imsangdoColorMap[code] }}></div>
                                            <span><strong>{code}</strong> - {imsangdoCodeDescriptions[code]}</span>
                                        </div>
                                    )
                                ))
                            }
                        </>
                    )}
                </div>
            )}

            {/* 등산로 범례 섹션 */}
            {visibleLegendTypes.includes('hiking_trail') && (
                 <div style={{ marginTop: (visibleLegendTypes.indexOf('hiking_trail') > 0 && visibleLegendTypes.length > 1) ? '10px' : '0' }}>
                    <h4>등산로 범례</h4>
                    <div style={{ borderBottom: '1px solid #ccc', margin: '5px 0' }}></div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                        {/* 등산로 범례는 색상 정보만 필요할 수 있음 */}
                        <div style={{ ...colorSwatchStyle, border: `2px dashed ${hikingTrailLegend.color}`, backgroundColor: 'transparent' /* 점선 표시 예시 */ }}></div>
                        <span>{hikingTrailLegend.description}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Legend;
