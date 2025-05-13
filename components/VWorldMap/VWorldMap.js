// src/components/VWorldMap/VWorldMap.js

import React, { useEffect, useRef, useState } from 'react';
import { Feature, Map, View } from 'ol';
import { Point } from 'ol/geom';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import XYZ from 'ol/source/XYZ';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import TileWMS from 'ol/source/TileWMS';
import { defaults as defaultControls } from 'ol/control';
import { Style, Circle, Fill, Stroke as OlStroke } from 'ol/style';
import 'ol/ol.css';

// 설정 및 데이터 파일 import
import {
    VWORLD_XYZ_URL,
    logicalLayersConfig, // 수정된 logicalLayersConfig 사용
    hikingTrailStyle
    // mountainMarkerLegendInfo // 범례에 마커 정보 표시 시 필요
} from './mapConfig';
import { mountainStationsData } from './mountainStations'; // 이 파일이 존재하고 올바른 데이터를 export하는지 확인
import { fetchWeatherData } from './weatherService'; // 이 파일이 존재하고 올바른 함수를 export하는지 확인

// 자식 컴포넌트 import
import Legend from './Legend';

// --- WeatherDisplay 컴포넌트 정의 (별도 파일로 분리 권장) ---
const WeatherDisplay = ({ selectedStationInfo }) => {
    const [weatherInfo, setWeatherInfo] = useState(null);
    const [isLoadingWeather, setIsLoadingWeather] = useState(false);
    const [weatherError, setWeatherError] = useState(null);

    useEffect(() => {
        if (!selectedStationInfo || !selectedStationInfo.obsid) {
            setWeatherInfo(null);
            return;
        }

        const loadWeatherData = async () => {
            setIsLoadingWeather(true);
            setWeatherError(null);
            const now = new Date();
            now.setMinutes(0, 0, 0);
            // now.setHours(now.getHours() - 1); // 필요시 시간 조정

            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const requestTm = `${year}${month}${day}${hours}00`;

            try {
                const data = await fetchWeatherData({ obsid: selectedStationInfo.obsid, tm: requestTm });
                setWeatherInfo(data);
            } catch (error) {
                setWeatherError(error.message);
            } finally {
                setIsLoadingWeather(false);
            }
        };
        loadWeatherData();
    }, [selectedStationInfo]);

    const displayStyle = {
        position: 'absolute',
        top: '80px',
        right: '10px',
        zIndex: 1000,
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: '10px',
        borderRadius: '5px',
        border: '1px solid #ccc',
        minWidth: '250px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
    };

    if (!selectedStationInfo) return null;
    if (isLoadingWeather) return <div style={displayStyle}><p>날씨 정보 로딩 중... ({selectedStationInfo.name})</p></div>;
    if (weatherError) return <div style={displayStyle}><p>날씨 정보 오류: {weatherError} ({selectedStationInfo.name})</p></div>;
    if (!weatherInfo) return <div style={displayStyle}><p>({selectedStationInfo.name}) 날씨 정보가 없습니다.</p></div>;

    return (
        <div style={displayStyle}>
            <h4>{weatherInfo.obsname || selectedStationInfo.name} ({weatherInfo.obsid})</h4>
            <p>관측시간: {weatherInfo.tm}</p>
            <p>온도 (2m): {weatherInfo.tm2m || 'N/A'}°C</p>
            <p>습도 (2m): {weatherInfo.hm2m || 'N/A'}%</p>
            <p>풍향 (2m): {weatherInfo.wd2mstr || 'N/A'} ({weatherInfo.wd2m || 'N/A'}°)</p>
            <p>풍속 (2m): {weatherInfo.ws2m || 'N/A'} m/s</p>
            <p>강수량: {weatherInfo.cprn || '0'} mm</p>
        </div>
    );
};
// --- WeatherDisplay 컴포넌트 정의 끝 ---


const VWorldMap = () => {
    const mapRef = useRef(null);
    const olMapRef = useRef(null);
    const layerRefs = useRef({});
    const [selectedStation, setSelectedStation] = useState(null);

    const [layerVisibility, setLayerVisibility] = useState(() => {
        const initialVisibility = {};
        logicalLayersConfig.forEach(group => {
            initialVisibility[group.name] = group.visible; // mapConfig.js의 visible 값으로 초기화
        });
        return initialVisibility;
    });

    const [activeSoilCodeFilter, setActiveSoilCodeFilter] = useState([]);
    const [activeImsangdoCodeFilter, setActiveImsangdoCodeFilter] = useState([]);
    const [visibleLegendTypes, setVisibleLegendTypes] = useState([]);
    const [collapsedLegends, setCollapsedLegends] = useState({ soil: false, imsangdo: false });
    const [soilOpacity, setSoilOpacity] = useState(1);
    const [imsangdoOpacity, setImsangdoOpacity] = useState(1);
    const [hikingTrailOpacity, setHikingTrailOpacity] = useState(1);

    const mountainMarkerStyle = new Style({
        image: new Circle({
            radius: 7,
            fill: new Fill({ color: 'rgba(0, 128, 0, 0.8)' }),
            stroke: new OlStroke({ color: 'white', width: 1.5 }),
        }),
    });

    useEffect(() => {
        if (!mapRef.current || olMapRef.current) return;

        const map = new Map({
            target: mapRef.current,
            controls: defaultControls(),
            layers: [new TileLayer({ source: new XYZ({ url: VWORLD_XYZ_URL, attributions: '© VWorld', maxZoom: 19 }) })],
            view: new View({ center: [127.8, 36.5], zoom: 7, projection: 'EPSG:4326' })
        });
        olMapRef.current = map;
        const currentLayerObjects = {};

        logicalLayersConfig.forEach(groupConfig => {
            if (groupConfig.type === 'mountain_station_markers') { // 마커 레이어는 여기서 생성
                const stationMarkerConfig = groupConfig; // 명확성을 위해 변수 할당
                const stationFeatures = mountainStationsData.map(station => {
                    const feature = new Feature({
                        geometry: new Point([station.longitude, station.latitude]),
                        obsid: station.obsid,
                        name: station.name,
                        area: station.area
                    });
                    return feature;
                });
                const stationVectorSource = new VectorSource({ features: stationFeatures });
                const stationVectorLayer = new VectorLayer({
                    source: stationVectorSource,
                    style: mountainMarkerStyle,
                    visible: layerVisibility[stationMarkerConfig.name], // 초기 가시성 적용
                });
                map.addLayer(stationVectorLayer);
                currentLayerObjects['mountainStationMarkers'] = stationVectorLayer; // 고유한 키로 저장
            } else { // 기존 데이터 레이어 (토양, 임상도, 등산로)
                const initialVisible = layerVisibility[groupConfig.name];
                let initialOpacityValue = 1;
                if (groupConfig.type === 'soil') initialOpacityValue = soilOpacity;
                else if (groupConfig.type === 'imsangdo') initialOpacityValue = imsangdoOpacity;
                else if (groupConfig.type === 'hiking_trail') initialOpacityValue = hikingTrailOpacity;

                if (groupConfig.type === 'soil' || groupConfig.type === 'imsangdo') {
                    groupConfig.layerNames.forEach(individualLayerName => {
                        const wmsSource = new TileWMS({
                            url: groupConfig.url,
                            params: { 'LAYERS': individualLayerName, 'FORMAT': 'image/png', 'TILED': true, 'VERSION': '1.1.1' },
                            serverType: 'geoserver', projection: 'EPSG:4326',
                        });
                        const wmsLayer = new TileLayer({ source: wmsSource, visible: initialVisible, opacity: initialOpacityValue });
                        map.addLayer(wmsLayer);
                        currentLayerObjects[individualLayerName] = wmsLayer;
                    });
                } else if (groupConfig.type === 'hiking_trail') {
                    const vectorSource = new VectorSource({});
                    const vectorLayer = new VectorLayer({ source: vectorSource, style: hikingTrailStyle, visible: initialVisible, opacity: initialOpacityValue });
                    map.addLayer(vectorLayer);
                    currentLayerObjects[groupConfig.name] = vectorLayer; // 등산로는 groupConfig.name을 키로 사용
                    const geojsonFormat = new GeoJSON();
                    const fileUrl = groupConfig.fileUrls[0];
                    if (fileUrl) {
                        fetch(fileUrl)
                            .then(response => response.ok ? response.json() : Promise.reject(response.status))
                            .then(geojson => {
                                const features = geojsonFormat.readFeatures(geojson, { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:4326' });
                                vectorSource.addFeatures(features);
                            })
                            .catch(error => console.error(`GeoJSON 로딩 에러: ${fileUrl}`, error));
                    }
                }
            }
        });
        layerRefs.current = currentLayerObjects;

        map.on('click', (event) => {
            const markerLayer = layerRefs.current['mountainStationMarkers']; // 저장된 키로 접근
            if (markerLayer && markerLayer.getVisible()) {
                let featureFound = false;
                map.forEachFeatureAtPixel(event.pixel, (feature, layer) => {
                    if (layer === markerLayer) {
                        const obsid = feature.get('obsid');
                        const name = feature.get('name');
                        if (obsid) {
                            setSelectedStation({ obsid, name });
                            featureFound = true;
                        }
                    }
                });
                // if (!featureFound) {
                // setSelectedStation(null); // 맵의 빈 공간 클릭 시 날씨 정보 창 닫기
                // }
            }
        });

        return () => {
            if (olMapRef.current) {
                olMapRef.current.dispose();
                olMapRef.current = null;
            }
            layerRefs.current = {};
        };
    }, []); // 마운트 시 1회 실행


    // --- 레이어 가시성 업데이트 통합 useEffect ---
    useEffect(() => {
        if (!olMapRef.current || Object.keys(layerRefs.current).length === 0) return;

        logicalLayersConfig.forEach(groupConfig => {
            const layerNameOrTypeKey = groupConfig.type === 'mountain_station_markers'
                ? 'mountainStationMarkers' // 마커 레이어 참조 키
                : groupConfig.name; // 등산로 또는 기타 단일 레이어 그룹의 이름

            const isGroupVisible = layerVisibility[groupConfig.name];

            if (groupConfig.type === 'soil' || groupConfig.type === 'imsangdo') {
                groupConfig.layerNames.forEach(individualLayerName => {
                    const layer = layerRefs.current[individualLayerName];
                    if (layer && layer.getVisible() !== isGroupVisible) {
                        layer.setVisible(isGroupVisible);
                    }
                });
            } else { // 'hiking_trail' 또는 'mountain_station_markers'
                const layer = layerRefs.current[layerNameOrTypeKey];
                if (layer && layer.getVisible() !== isGroupVisible) {
                    layer.setVisible(isGroupVisible);
                }
                // 마커 레이어가 숨겨지면 선택된 관측소 정보 초기화
                if (groupConfig.type === 'mountain_station_markers' && !isGroupVisible) {
                    setSelectedStation(null);
                }
            }
        });
    }, [layerVisibility]);


    useEffect(() => {
        const currentlyVisibleTypes = logicalLayersConfig
            .filter(group => layerVisibility[group.name])
            .map(group => group.type);
        setVisibleLegendTypes(currentlyVisibleTypes);
    }, [layerVisibility]);

    // 토양 CQL 필터 업데이트 useEffect
    useEffect(() => {
        if (!olMapRef.current || Object.keys(layerRefs.current).length === 0) return;
        let cqlFilter = undefined;
        if (activeSoilCodeFilter && activeSoilCodeFilter.length > 0) {
            const quotedCodes = activeSoilCodeFilter.map(code => `'${code}'`).join(',');
            cqlFilter = `SLTP_CD IN (${quotedCodes})`; // 속성명 확인 필요
        }
        const soilGroup = logicalLayersConfig.find(group => group.type === 'soil');
        if (soilGroup) {
            soilGroup.layerNames.forEach(individualLayerName => {
                const layer = layerRefs.current[individualLayerName];
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
        if (!olMapRef.current || Object.keys(layerRefs.current).length === 0) return;
        let cqlFilter = undefined;
        if (activeImsangdoCodeFilter && activeImsangdoCodeFilter.length > 0) {
            const quotedCodes = activeImsangdoCodeFilter.map(code => `'${code}'`).join(',');
            const imsangdoAttributeName = 'FRTP_CD'; // 속성명 확인 필요
            cqlFilter = `${imsangdoAttributeName} IN (${quotedCodes})`;
        }
         const imsangdoGroup = logicalLayersConfig.find(group => group.type === 'imsangdo');
        if (imsangdoGroup) {
            imsangdoGroup.layerNames.forEach(individualLayerName => {
                 const layer = layerRefs.current[individualLayerName];
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
        if (!olMapRef.current || Object.keys(layerRefs.current).length === 0) return;
        const soilGroup = logicalLayersConfig.find(group => group.type === 'soil');
        if (soilGroup) {
            soilGroup.layerNames.forEach(individualLayerName => {
                const layer = layerRefs.current[individualLayerName];
                if (layer) layer.setOpacity(soilOpacity);
            });
        }
    }, [soilOpacity]); // soilOpacity 변경 시 실행

    // 임상도 투명도 업데이트 useEffect
     useEffect(() => {
        if (!olMapRef.current || Object.keys(layerRefs.current).length === 0) return;
        const imsangdoGroup = logicalLayersConfig.find(group => group.type === 'imsangdo');
        if (imsangdoGroup) {
            imsangdoGroup.layerNames.forEach(individualLayerName => {
                const layer = layerRefs.current[individualLayerName];
                if (layer) layer.setOpacity(imsangdoOpacity);
            });
        }
    }, [imsangdoOpacity]); // imsangdoOpacity 변경 시 실행

    // 등산로 투명도 업데이트 useEffect
    useEffect(() => {
        if (!olMapRef.current || Object.keys(layerRefs.current).length === 0) return;
        const hikingTrailGroup = logicalLayersConfig.find(group => group.type === 'hiking_trail');
        if (hikingTrailGroup) {
            const vectorLayer = layerRefs.current[hikingTrailGroup.name];
            if (vectorLayer) vectorLayer.setOpacity(hikingTrailOpacity);
        }
    }, [hikingTrailOpacity]); // hikingTrailOpacity 변경 시 실행

    const handleOpacityChange = (groupType, event) => {
        const value = parseFloat(event.target.value);
        if (groupType === 'soil') {
        setSoilOpacity(value);
        } else if (groupType === 'imsangdo') {
        setImsangdoOpacity(value);
        } else if (groupType === 'hiking_trail') {
        setHikingTrailOpacity(value);
        }
    };

    const handleToggleVisibility = (groupName) => { /* 이전과 동일 */
        setLayerVisibility(prevVisibility => {
            const newVisibility = { ...prevVisibility, [groupName]: !prevVisibility[groupName] };
            if (!newVisibility[groupName]) {
                const group = logicalLayersConfig.find(g => g.name === groupName);
                if (group) {
                    if (group.type === 'soil') setActiveSoilCodeFilter([]);
                    else if (group.type === 'imsangdo') setActiveImsangdoCodeFilter([]);
                    // 마커 레이어가 꺼지면 선택된 역도 초기화 (useEffect에서 이미 처리하지만, 여기서도 가능)
                    // if (group.type === 'mountain_station_markers') setSelectedStation(null);
                }
            }
            return newVisibility;
        });
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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', position: 'relative' }}>
            <div ref={mapRef} style={{ width: '100%', height: 'calc(100vh - 50px)' }}>
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
                    // ▶️ 추가된 props
                    logicalLayersConfig={logicalLayersConfig}
                    layerVisibility={layerVisibility}
                    soilOpacity={soilOpacity}
                    imsangdoOpacity={imsangdoOpacity}
                    hikingTrailOpacity={hikingTrailOpacity}
                    onToggleVisibility={handleToggleVisibility}
                    onOpacityChange={handleOpacityChange}
                />
                <WeatherDisplay selectedStationInfo={selectedStation} />
            </div>
        </div>
    );
};

export default VWorldMap;
