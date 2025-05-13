// src/components/VWorldMap/VWorldMap.js

import React, { useEffect, useRef, useState } from 'react';
import { Map, View } from 'ol';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import TileWMS from 'ol/source/TileWMS';
import { defaults as defaultControls } from 'ol/control';
import 'ol/ol.css';

// 설정 가져오기
import {
    VWORLD_XYZ_URL,
    logicalLayersConfig,
    hikingTrailStyle // 레이어 생성 시 필요
    // 다른 상수들은 자식 컴포넌트에서 직접 import 하거나 여기서 props로 넘겨줄 필요 없음
} from './mapConfig';

// 분리된 자식 컴포넌트들 가져오기
import LayerControlPanel from './LayerControlPanel';
import Legend from './Legend';
// import MapCanvas from './MapCanvas'; // 추후 MapCanvas 분리 시 활성화

const VWorldMap = () => {
    // --- Refs ---
    const mapRef = useRef(null); // 맵이 그려질 div 참조 (MapCanvas로 전달 가능)
    const olMapRef = useRef(null); // OpenLayers 맵 객체 참조
    const wmsLayersRef = useRef({}); // OL 레이어 객체 참조 (관리 방식 변경 가능)

    // --- 상태 정의 (useState) ---
    const [layerVisibility, setLayerVisibility] = useState(() => {
        const initialVisibility = {};
        logicalLayersConfig.forEach(group => {
            initialVisibility[group.name] = group.visible;
        });
        return initialVisibility;
    });
    const [activeSoilCodeFilter, setActiveSoilCodeFilter] = useState([]);
    const [activeImsangdoCodeFilter, setActiveImsangdoCodeFilter] = useState([]);
    const [visibleLegendTypes, setVisibleLegendTypes] = useState([]);
    const [collapsedLegends, setCollapsedLegends] = useState({
        soil: false,
        imsangdo: false,
    });
    const [soilOpacity, setSoilOpacity] = useState(1);
    const [imsangdoOpacity, setImsangdoOpacity] = useState(1);
    const [hikingTrailOpacity, setHikingTrailOpacity] = useState(1);

    // --- useEffect 훅들 (맵 초기화 및 레이어 관리 로직 - 추후 분리 가능) ---
    useEffect(() => {
        // 맵 생성 및 초기 레이어 추가 로직 (현재는 여기에 유지)
        if (!mapRef.current || olMapRef.current) { // 중복 생성 방지
             return;
        }

        const map = new Map({
            target: mapRef.current,
            controls: defaultControls(),
            layers: [
                new TileLayer({
                    source: new XYZ({
                        url: VWORLD_XYZ_URL,
                        attributions: '© <a href="http://vworld.kr">VWorld</a>',
                        maxZoom: 19
                    })
                })
            ],
            view: new View({
                center: [127.8, 36.5],
                zoom: 7,
                projection: 'EPSG:4326'
            })
        });
        olMapRef.current = map;

        // 데이터 레이어 추가
        logicalLayersConfig.forEach(groupConfig => {
            if (groupConfig.type === 'soil' || groupConfig.type === 'imsangdo') {
                groupConfig.layerNames.forEach(individualLayerName => {
                    const wmsSource = new TileWMS({
                        url: groupConfig.url,
                        params: { 'LAYERS': individualLayerName, 'FORMAT': 'image/png', 'TILED': true, 'VERSION': '1.1.1' },
                        serverType: 'geoserver',
                        projection: 'EPSG:4326',
                    });
                    const wmsLayer = new TileLayer({
                        source: wmsSource,
                        // layerVisibility 상태 사용
                        visible: layerVisibility[groupConfig.name],
                        // 해당 타입의 opacity 상태 사용
                        opacity: groupConfig.type === 'soil' ? soilOpacity : imsangdoOpacity,
                    });
                    map.addLayer(wmsLayer);
                    wmsLayersRef.current[individualLayerName] = wmsLayer; // 레이어 참조 저장
                });
            } else if (groupConfig.type === 'hiking_trail') {
                const vectorSource = new VectorSource({});
                const vectorLayer = new VectorLayer({
                    source: vectorSource,
                    style: hikingTrailStyle, // mapConfig에서 가져온 스타일 사용
                    visible: layerVisibility[groupConfig.name], // 가시성 상태 사용
                    opacity: hikingTrailOpacity, // 투명도 상태 사용
                });
                map.addLayer(vectorLayer);
                wmsLayersRef.current[groupConfig.name] = vectorLayer; // 레이어 참조 저장

                const geojsonFormat = new GeoJSON();
                const fileUrl = groupConfig.fileUrls[0];
                if (fileUrl) {
                    fetch(fileUrl)
                        .then(response => response.ok ? response.json() : Promise.reject(response.status))
                        .then(geojson => {
                            const features = geojsonFormat.readFeatures(geojson, {
                                dataProjection: 'EPSG:4326', featureProjection: 'EPSG:4326',
                            });
                            vectorSource.addFeatures(features);
                        })
                        .catch(error => console.error(`GeoJSON 로딩 에러: ${fileUrl}`, error));
                } else {
                    console.error(`GeoJSON 파일 URL 없음.`);
                }
            }
        });

        // 컴포넌트 언마운트 시 맵 정리
        return () => {
            if (olMapRef.current) {
                olMapRef.current.dispose();
                olMapRef.current = null;
                wmsLayersRef.current = {}; // 레이어 참조 초기화
            }
        };
    // 의존성 배열: 초기 상태값들이 설정된 후 실행되도록 관련 상태 포함 가능
    // 하지만, 초기 맵 설정은 한번만 실행되어야 하므로 [] 유지 또는 신중히 관리
    }, [layerVisibility, soilOpacity, imsangdoOpacity, hikingTrailOpacity]); // 초기 상태 반영 위해 포함

    // 레이어 가시성 업데이트 useEffect
    useEffect(() => {
        if (!olMapRef.current || Object.keys(wmsLayersRef.current).length === 0) return;

        logicalLayersConfig.forEach(groupConfig => {
            const isGroupVisible = layerVisibility[groupConfig.name];
            if (groupConfig.type === 'soil' || groupConfig.type === 'imsangdo') {
                groupConfig.layerNames.forEach(individualLayerName => {
                    const layer = wmsLayersRef.current[individualLayerName];
                    if (layer && layer.getVisible() !== isGroupVisible) {
                        layer.setVisible(isGroupVisible);
                    }
                });
            } else if (groupConfig.type === 'hiking_trail') {
                const vectorLayer = wmsLayersRef.current[groupConfig.name];
                if (vectorLayer && vectorLayer.getVisible() !== isGroupVisible) {
                    vectorLayer.setVisible(isGroupVisible);
                }
            }
        });
    }, [layerVisibility]); // layerVisibility 변경 시 실행

    // 표시할 범례 타입 업데이트 useEffect
    useEffect(() => {
        const currentlyVisibleTypes = logicalLayersConfig
            .filter(group => layerVisibility[group.name])
            .map(group => group.type);
        setVisibleLegendTypes(currentlyVisibleTypes);
    }, [layerVisibility]); // layerVisibility 변경 시 실행

    // 토양 CQL 필터 업데이트 useEffect
    useEffect(() => {
        if (!olMapRef.current || Object.keys(wmsLayersRef.current).length === 0) return;
        let cqlFilter = undefined;
        if (activeSoilCodeFilter && activeSoilCodeFilter.length > 0) {
            const quotedCodes = activeSoilCodeFilter.map(code => `'${code}'`).join(',');
            cqlFilter = `SLTP_CD IN (${quotedCodes})`; // 속성명 확인 필요
        }
        const soilGroup = logicalLayersConfig.find(group => group.type === 'soil');
        if (soilGroup) {
            soilGroup.layerNames.forEach(individualLayerName => {
                const layer = wmsLayersRef.current[individualLayerName];
                if (layer) {
                    const source = layer.getSource();
                    const params = source.getParams();
                    if (cqlFilter !== undefined) {
                        params.CQL_FILTER = cqlFilter;
                    } else {
                        delete params.CQL_FILTER;
                    }
                    source.updateParams(params);
                }
            });
        }
    }, [activeSoilCodeFilter]); // activeSoilCodeFilter 변경 시 실행

    // 임상도 CQL 필터 업데이트 useEffect
    useEffect(() => {
        if (!olMapRef.current || Object.keys(wmsLayersRef.current).length === 0) return;
        let cqlFilter = undefined;
        if (activeImsangdoCodeFilter && activeImsangdoCodeFilter.length > 0) {
            const quotedCodes = activeImsangdoCodeFilter.map(code => `'${code}'`).join(',');
            const imsangdoAttributeName = 'FRTP_CD'; // 속성명 확인 필요
            cqlFilter = `${imsangdoAttributeName} IN (${quotedCodes})`;
        }
         const imsangdoGroup = logicalLayersConfig.find(group => group.type === 'imsangdo');
        if (imsangdoGroup) {
            imsangdoGroup.layerNames.forEach(individualLayerName => {
                 const layer = wmsLayersRef.current[individualLayerName];
                if (layer) {
                    const source = layer.getSource();
                    const params = source.getParams();
                    if (cqlFilter !== undefined) {
                        params.CQL_FILTER = cqlFilter;
                    } else {
                        delete params.CQL_FILTER;
                    }
                    source.updateParams(params);
                }
            });
        }
    }, [activeImsangdoCodeFilter]); // activeImsangdoCodeFilter 변경 시 실행

    // 토양 투명도 업데이트 useEffect
    useEffect(() => {
        if (!olMapRef.current || Object.keys(wmsLayersRef.current).length === 0) return;
        const soilGroup = logicalLayersConfig.find(group => group.type === 'soil');
        if (soilGroup) {
            soilGroup.layerNames.forEach(individualLayerName => {
                const layer = wmsLayersRef.current[individualLayerName];
                if (layer) layer.setOpacity(soilOpacity);
            });
        }
    }, [soilOpacity]); // soilOpacity 변경 시 실행

    // 임상도 투명도 업데이트 useEffect
     useEffect(() => {
        if (!olMapRef.current || Object.keys(wmsLayersRef.current).length === 0) return;
        const imsangdoGroup = logicalLayersConfig.find(group => group.type === 'imsangdo');
        if (imsangdoGroup) {
            imsangdoGroup.layerNames.forEach(individualLayerName => {
                const layer = wmsLayersRef.current[individualLayerName];
                if (layer) layer.setOpacity(imsangdoOpacity);
            });
        }
    }, [imsangdoOpacity]); // imsangdoOpacity 변경 시 실행

    // 등산로 투명도 업데이트 useEffect
    useEffect(() => {
        if (!olMapRef.current || Object.keys(wmsLayersRef.current).length === 0) return;
        const hikingTrailGroup = logicalLayersConfig.find(group => group.type === 'hiking_trail');
        if (hikingTrailGroup) {
            const vectorLayer = wmsLayersRef.current[hikingTrailGroup.name];
            if (vectorLayer) vectorLayer.setOpacity(hikingTrailOpacity);
        }
    }, [hikingTrailOpacity]); // hikingTrailOpacity 변경 시 실행


    // --- 이벤트 핸들러 함수들 (자식 컴포넌트에 props로 전달) ---
    const handleToggleVisibility = (groupName) => {
        setLayerVisibility(prevVisibility => {
            const newVisibility = { ...prevVisibility, [groupName]: !prevVisibility[groupName] };
            // 레이어 숨길 때 필터/범례 상태 초기화 로직
            if (!newVisibility[groupName]) {
                const group = logicalLayersConfig.find(g => g.name === groupName);
                if (group) {
                    if (group.type === 'soil') setActiveSoilCodeFilter([]);
                    else if (group.type === 'imsangdo') setActiveImsangdoCodeFilter([]);
                    // 범례 접힘 상태 초기화는 Legend 컴포넌트 내부 또는 여기서 관리 가능
                    // setCollapsedLegends(prev => ({...prev, [group.type]: false }));
                }
            }
            return newVisibility;
        });
    };

    const handleOpacityChange = (groupType, event) => {
        const newOpacity = parseFloat(event.target.value);
        if (groupType === 'soil') setSoilOpacity(newOpacity);
        else if (groupType === 'imsangdo') setImsangdoOpacity(newOpacity);
        else if (groupType === 'hiking_trail') setHikingTrailOpacity(newOpacity);
    };

    const handleSoilLegendItemClick = (code) => {
        setActiveSoilCodeFilter(prevFilter => {
            const newFilter = [...prevFilter];
            const codeIndex = newFilter.indexOf(code);
            if (codeIndex > -1) newFilter.splice(codeIndex, 1);
            else newFilter.push(code);
            newFilter.sort((a, b) => parseInt(a, 10) - parseInt(b, 10)); // 정렬
            return newFilter;
        });
    };

    const handleShowAllSoilClick = () => setActiveSoilCodeFilter([]);

    const handleImsangdoLegendItemClick = (code) => {
         setActiveImsangdoCodeFilter(prevFilter => {
            const newFilter = [...prevFilter];
            const codeIndex = newFilter.indexOf(code);
            if (codeIndex > -1) newFilter.splice(codeIndex, 1);
            else newFilter.push(code);
            newFilter.sort((a, b) => parseInt(a, 10) - parseInt(b, 10)); // 정렬
            return newFilter;
        });
    };

    const handleShowAllImsangdoClick = () => setActiveImsangdoCodeFilter([]);

    const toggleLegendCollapse = (type) => {
        if (type === 'soil' || type === 'imsangdo') {
            setCollapsedLegends(prevState => ({ ...prevState, [type]: !prevState[type] }));
        }
    };


    // --- JSX 렌더링 (자식 컴포넌트 사용) ---
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

            {/* LayerControlPanel 렌더링 및 props 전달 */}
            <LayerControlPanel
                logicalLayersConfig={logicalLayersConfig}
                layerVisibility={layerVisibility}
                soilOpacity={soilOpacity}
                imsangdoOpacity={imsangdoOpacity}
                hikingTrailOpacity={hikingTrailOpacity}
                onToggleVisibility={handleToggleVisibility}
                onOpacityChange={handleOpacityChange}
            />

            {/* 맵이 렌더링될 영역 (추후 MapCanvas 컴포넌트로 대체 가능) */}
            <div ref={mapRef} style={{ width: '100%', flexGrow: 1, position: 'relative' /* 범례 위치 기준 */ }}>

                {/* Legend 렌더링 및 props 전달 */}
                {/* 범례는 맵 위에 표시되므로 맵 div 내부에 위치시키는 것이 일반적 */}
                <Legend
                    visibleLegendTypes={visibleLegendTypes}
                    collapsedLegends={collapsedLegends}
                    activeSoilCodeFilter={activeSoilCodeFilter}
                    activeImsangdoCodeFilter={activeImsangdoCodeFilter}
                    onToggleLegendCollapse={toggleLegendCollapse}
                    onSoilLegendItemClick={handleSoilLegendItemClick}
                    onShowAllSoilClick={handleShowAllSoilClick}
                    onImsangdoLegendItemClick={handleImsangdoLegendItemClick}
                    onShowAllImsangdoClick={handleShowAllImsangdoClick}
                />
            </div>
             {/* <MapCanvas /> 추후 여기에 맵 캔버스 컴포넌트 렌더링 */}

        </div>
    );
};

export default VWorldMap;
