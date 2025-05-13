// src/components/VWorldMap/Legend.js

import React from 'react';
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
}) => {

    // 스타일 객체는 이 컴포넌트 내에서 정의하거나 props로 받을 수 있습니다.
    // 여기서는 내부에서 정의하는 것으로 가정합니다.
    const legendContainerStyle = {
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        zIndex: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '5px',
        maxHeight: '80vh',
        overflowY: 'auto',
        fontSize: '12px',
        color: '#333',
        textAlign: 'left',
        pointerEvents: 'auto', // 범례 클릭 가능하도록
    };

    const colorSwatchStyle = {
        width: '20px',
        height: '20px',
        opacity: 0.8,
        border: '1px solid #333',
        marginRight: '10px',
        flexShrink: 0
    };

    // visibleLegendTypes가 없거나 비어있으면 범례 자체를 렌더링하지 않음
    if (!visibleLegendTypes || visibleLegendTypes.length === 0) {
        return null;
    }

    return (
        <div style={legendContainerStyle}>
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
