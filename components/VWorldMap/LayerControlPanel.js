// src/components/VWorldMap/LayerControlPanel.js

import React from 'react';

const LayerControlPanel = ({
    logicalLayersConfig,     // 레이어 설정 배열
    layerVisibility,         // 레이어 그룹별 가시성 상태 객체
    soilOpacity,             // 토양 레이어 투명도 상태
    imsangdoOpacity,         // 임상도 레이어 투명도 상태
    hikingTrailOpacity,      // 등산로 레이어 투명도 상태
    onToggleVisibility,      // 가시성 토글 핸들러 함수
    onOpacityChange,         // 투명도 변경 핸들러 함수
}) => {
    return (
        <div style={{ padding: '10px', borderBottom: '1px solid #ccc', backgroundColor: '#f9f9f9', flexShrink: 0 }}>
            <h4>데이터 레이어 표시/숨기기 및 투명도</h4>
            {logicalLayersConfig.map(groupConfig => (
                <div key={groupConfig.name} style={{ marginBottom: '10px' }}>
                    <label style={{ marginRight: '15px' }}>
                        <input
                            type="checkbox"
                            // layerVisibility 객체가 로드되기 전에 접근하는 것을 방지
                            checked={layerVisibility?.[groupConfig.name] || false}
                            onChange={() => onToggleVisibility(groupConfig.name)}
                        />
                        {groupConfig.name}
                    </label>

                    {/* layerVisibility 객체가 로드되기 전에 접근하는 것을 방지 */}
                    {layerVisibility?.[groupConfig.name] && (
                        <div style={{ display: 'inline-block', marginLeft: '10px', verticalAlign: 'middle' }}>
                            <label htmlFor={`opacity-${groupConfig.type}`} style={{ marginRight: '5px', fontSize: '11px' }}>투명도:</label>
                            <input
                                id={`opacity-${groupConfig.type}`}
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={
                                    // 각 타입에 맞는 투명도 값 할당
                                    groupConfig.type === 'soil' ? soilOpacity :
                                    (groupConfig.type === 'imsangdo' ? imsangdoOpacity : hikingTrailOpacity)
                                }
                                onChange={(event) => onOpacityChange(groupConfig.type, event)}
                                style={{ width: '100px', verticalAlign: 'middle' }}
                            />
                            <span style={{ marginLeft: '5px', fontSize: '11px' }}>
                                {(
                                    // 각 타입에 맞는 투명도 값 표시
                                    groupConfig.type === 'soil' ? soilOpacity :
                                    (groupConfig.type === 'imsangdo' ? imsangdoOpacity : hikingTrailOpacity)
                                ).toFixed(2)}
                            </span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default LayerControlPanel;
