"use client";

import { useEffect, useRef, useState } from "react";
import {
  Canvas,
  useFrame,
  useThree,
} from "@react-three/fiber";
import {
  OrbitControls,
  Stars,
  Text,
  useTexture,
} from "@react-three/drei";
import * as THREE from "three";

type Photo = {
  id: string;
  url: string;
  caption: string | null;
  created_at: string;
};

type Journal = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  photos: Photo[];
};

type Place = {
  id: string;
  user_id: string | null;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  description: string | null;
  journals: Journal[];
};


function Earth() {
  const texture = useTexture("/textures/earth-night.jpg");
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  texture.colorSpace = THREE.SRGBColorSpace;

  useFrame(() => {
    const material = materialRef.current;
    if (!material) return;

    // 使用真实 UTC 时间计算太阳位置
    const now = new Date();
    const utcHours =
      now.getUTCHours() +
      now.getUTCMinutes() / 60 +
      now.getUTCSeconds() / 3600;

    // 太阳直射点的近似经度
    const sunLongitude = ((12 - utcHours) * 15) * Math.PI / 180;

    // 根据一年中的日期近似计算太阳赤纬
    const startOfYear = new Date(
      Date.UTC(now.getUTCFullYear(), 0, 0)
    );
    const dayOfYear = Math.floor(
      (now.getTime() - startOfYear.getTime()) / 86400000
    );

    const declination =
      23.44 *
      Math.sin((2 * Math.PI * (284 + dayOfYear)) / 365) *
      Math.PI / 180;

    // 坐标系与当前城市标记使用的经纬度约定一致
    const sunX = Math.cos(declination) * Math.cos(sunLongitude);
    const sunY = Math.sin(declination);
    const sunZ = -Math.cos(declination) * Math.sin(sunLongitude);

    material.uniforms.sunDirection.value.set(
      sunX,
      sunY,
      sunZ
    );
  });

  return (
    <mesh>
      <sphereGeometry args={[2, 96, 96]} />

      <shaderMaterial
        ref={materialRef}
        uniforms={{
          map: { value: texture },
          sunDirection: {
            value: new THREE.Vector3(1, 0, 0),
          },
        }}
        vertexShader={`
          varying vec2 vUv;
          varying vec3 vWorldNormal;

          void main() {
            vUv = uv;
            vWorldNormal = normalize(
              mat3(modelMatrix) * normal
            );

            gl_Position = projectionMatrix
              * modelViewMatrix
              * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
  uniform sampler2D map;
  uniform vec3 sunDirection;

  varying vec2 vUv;
  varying vec3 vWorldNormal;

  void main() {
    vec3 color = texture2D(map, vUv).rgb;

    float sunFacing = dot(
      normalize(vWorldNormal),
      normalize(sunDirection)
    );

    // 更清晰的昼夜分界，保留自然过渡
    float daylight = smoothstep(
      -0.08,
      0.08,
      sunFacing
    );

    // 夜面深邃，白昼自然，不额外过曝
    float brightness = mix(
      0.25,
      0.95,
      daylight
    );

    // 晨昏光晕：集中在昼夜交界处
    float twilight = exp(
      -pow(sunFacing / 0.055, 2.0)
    );

    // 只增加中性柔光，不覆盖蓝色滤镜
    brightness += twilight * 0.12;

    gl_FragColor = vec4(
      color * brightness,
      1.0
    );

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`}
      />
    </mesh>
  );
}

function ZoomLevel({
  onZoomChange,
}: {
  onZoomChange: (zoomedIn: boolean) => void;
}) {
  const { camera } = useThree();

  useEffect(() => {
    let previousZoomedIn: boolean | null = null;

    const updateZoom = () => {
      const zoomedIn = camera.position.length() < 5.2;

      if (zoomedIn !== previousZoomedIn) {
        previousZoomedIn = zoomedIn;
        onZoomChange(zoomedIn);
      }
    };

    updateZoom();

    const interval = window.setInterval(updateZoom, 100);

    return () => window.clearInterval(interval);
  }, [camera, onZoomChange]);

  return null;
}

function PlaceMarker({
  latitude,
  longitude,
  onClick,
}: {
  latitude: number;
  longitude: number;
  onClick: () => void;
}) {
  const radius = 2.025;
  const phi = (90 - latitude) * (Math.PI / 180);
  const theta = (longitude + 180) * (Math.PI / 180);

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return (
    <group position={[x, y, z]}>
      {/* 只负责点击，不负责显示 */}
      <mesh onClick={onClick}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshBasicMaterial
          color="black"
          transparent
          opacity={0}
          depthWrite={false}
          colorWrite={false}
        />
      </mesh>

      {/* 微小的城市星点，不参与点击 */}
      <mesh raycast={() => null}>
        <sphereGeometry args={[0.018, 12, 12]} />
        <meshBasicMaterial
          color="#e5efff"
          toneMapped={false}
        />
      </mesh>

      {/* 非常淡的光晕 */}
      <mesh raycast={() => null}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshBasicMaterial
          color="#a8cfff"
          transparent
          opacity={0.12}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export default function Globe({
  places = [],
}: {
  places?: Place[];
}) {
  const [
    selectedPlace,
    setSelectedPlace,
  ] = useState<string | null>(null);
  
  const [showLabels, setShowLabels] = useState(false);

  const currentPlace =
    places.find(
      (place) =>
        place.id === selectedPlace
    );

  const journals =
    currentPlace?.journals ?? [];

  const photos =
    journals.flatMap(
      (journal) =>
        journal.photos ?? []
    );

  return (
    <div className="relative h-[55svh] min-h-[360px] max-h-[620px] w-full lg:h-full lg:min-h-0 lg:max-h-none">

      <Canvas
        camera={{
          position: [0, 0, 6],
          fov: 45,
        }}
        style={{ width: "100%", height: "100%" }}
      >

        <ambientLight
          intensity={1.1}
        />

        <directionalLight
          position={[5, 3, 5]}
          intensity={1.5}
        />

        <Stars
          radius={100}
          depth={50}
          count={3000}
          factor={4}
          saturation={0}
          fade
        />

        <ZoomLevel onZoomChange={setShowLabels} />

        <group>

          <Earth />

          {places.map((place) => (
            <PlaceMarker
              key={place.id}
              latitude={place.latitude}
              longitude={place.longitude}
              onClick={() => setSelectedPlace(place.id)}
            />
          ))}

        </group>

        <OrbitControls
          enableZoom={true}
          minDistance={2.8}
          maxDistance={10}
          enableDamping
          dampingFactor={0.05}
          autoRotate
          autoRotateSpeed={0.5}
        />

      </Canvas>

      {currentPlace && (

        <div className="absolute bottom-6 left-1/2 w-80 -translate-x-1/2 rounded-3xl border border-white/10 bg-black/70 p-6 text-white shadow-2xl backdrop-blur-xl">

          {/* Close */}

          <button
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
            onClick={() =>
              setSelectedPlace(null)
            }
          >
            ×
          </button>

          <p className="text-xs tracking-[0.3em] text-white/50">
            MY JOURNEY
          </p>

          <h2 className="mt-2 text-3xl font-light">
            {currentPlace.city}
          </h2>

          <p className="mt-1 text-sm text-white/50">
            {currentPlace.country}
          </p>

          {currentPlace.description && (
            <p className="mt-4 text-sm leading-6 text-white/60">
              {currentPlace.description}
            </p>
          )}

          {/* Photos */}

          {photos.length > 0 && (
            <div className="mt-5">
              <div className="grid grid-cols-2 gap-2">

                {photos
                  .slice(0, 4)
                  .map((photo) => (
                    <div
                      key={photo.id}
                      className="relative h-28 w-full overflow-hidden rounded-xl bg-white/10"
                    >

                      <img
                        src={photo.url}
                        alt={
                          photo.caption ||
                          `${currentPlace.city} memory`
                        }
                        className="h-full w-full object-cover"
                        onLoad={() => {
                          console.log(
                            "✅ IMAGE LOADED:",
                            photo.url
                          );
                        }}
                        onError={(e) => {
                          console.error(
                            "❌ IMAGE FAILED:",
                            photo.url,
                            e
                          );
                        }}
                      />

                    </div>
                  ))}

              </div>
            </div>
          )}

          {/* Stats */}

          <div className="mt-6 grid grid-cols-2 gap-3 text-center text-xs text-white/60">

            <div>

              <div className="text-lg text-white">
                {journals.length}
              </div>

              <div>
                Journals
              </div>

            </div>

            <div>

              <div className="text-lg text-white">
                {photos.length}
              </div>

              <div>
                Photos
              </div>

            </div>

          </div>

          <button
            className="mt-6 w-full rounded-full bg-white px-4 py-3 text-xs tracking-widest text-black transition hover:bg-white/80"
            onClick={() => {
              window.location.href =
                `/places/${currentPlace.id}`;
            }}
          >
            EXPLORE
          </button>

        </div>

      )}

    </div>
  );
}