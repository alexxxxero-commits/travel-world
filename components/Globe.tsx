"use client";

import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Stars,
  useTexture,
} from "@react-three/drei";
import { useState } from "react";

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
  const texture = useTexture(
    "/textures/earth-night.jpg"
  );

  return (
    <mesh>
      <sphereGeometry
        args={[2, 64, 64]}
      />

      <meshStandardMaterial
        map={texture}
      />
    </mesh>
  );
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
  const radius = 2.05;

  const phi =
    (90 - latitude) *
    (Math.PI / 180);

  const theta =
    (longitude + 180) *
    (Math.PI / 180);

  const x =
    -radius *
    Math.sin(phi) *
    Math.cos(theta);

  const y =
    radius * Math.cos(phi);

  const z =
    radius *
    Math.sin(phi) *
    Math.sin(theta);

  return (
    <mesh
      position={[x, y, z]}
      onClick={onClick}
    >
      <sphereGeometry
        args={[0.06, 32, 32]}
      />

      <meshBasicMaterial
        color="#ffffff"
      />
    </mesh>
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
    <div className="relative h-[600px] w-full">

      <Canvas
        camera={{
          position: [0, 0, 6],
          fov: 45,
        }}
      >

        <ambientLight
          intensity={0.35}
        />

        <directionalLight
          position={[5, 3, 5]}
          intensity={2.5}
        />

        <Stars
          radius={100}
          depth={50}
          count={3000}
          factor={4}
          saturation={0}
          fade
        />

        <group>

          <Earth />

          {places.map((place) => (
            <PlaceMarker
              key={place.id}
              latitude={place.latitude}
              longitude={place.longitude}
              onClick={() =>
                setSelectedPlace(
                  place.id
                )
              }
            />
          ))}

        </group>

        <OrbitControls
          enableZoom={false}
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