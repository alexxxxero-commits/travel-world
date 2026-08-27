export type Place = {
  id: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  description: string;

  photos: string[];

  restaurants: {
    name: string;
    description: string;
  }[];

  attractions: {
    name: string;
    description: string;
  }[];

  journals: {
    date: string;
    title: string;
    content: string;
  }[];
};

export const places: Place[] = [
  {
    id: "santiago",
    city: "Santiago",
    country: "Chile",

    latitude: -33.45,
    longitude: -70.67,

    description: "My first memories in Chile.",

    photos: [
      "/photos/santiago-01.jpg",
    ],

    restaurants: [
      {
        name: "Example Restaurant",
        description: "A restaurant I want to remember.",
      },
    ],

    attractions: [
      {
        name: "Cerro San Cristóbal",
        description: "A beautiful view over Santiago.",
      },
      {
        name: "Plaza de Armas",
        description: "The historic center of Santiago.",
      },
    ],

    journals: [
      {
        date: "2026-08-15",
        title: "My first days in Santiago",
        content: "This is where my Chile story begins.",
      },
    ],
  },
];