/**
 * The Pizzeria Sarah menu, transcribed from the printed menu of November 2025
 * (content/menukaart-2025-11/menukaart-blad-1.png and -blad-2.png).
 * Names, numbers, descriptions and prices are exactly as printed. Allergen
 * information is not on the printed menu and is therefore left empty.
 */

export type MenuSeedItem = {
  number: string;
  name: string;
  description?: string;
  /** Price in euros as printed; null when no price is printed. */
  price: number | null;
  featured?: boolean;
};

export type MenuSeedCategory = { name: string; slug: string; items: MenuSeedItem[] };

export const MENU_2025_11: MenuSeedCategory[] = [
  {
    name: 'Insalata / Salade',
    slug: 'salade',
    items: [
      { number: '1', name: 'Salade mista', description: 'Gemengde salade', price: 6.0 },
      { number: '2', name: 'Tonijn salade', description: 'Gemengde salade en tonijn', price: 7.5 },
    ],
  },
  {
    name: 'Kleine schotels',
    slug: 'kleine-schotels',
    items: [
      { number: '3', name: 'Hamburger', price: 7.5 },
      { number: '4', name: 'Shoarma', price: 10.0 },
      { number: '5', name: 'Kip', price: 10.5 },
      { number: '6', name: 'Frikandel', price: 7.5 },
    ],
  },
  {
    name: "Pizza's",
    slug: 'pizzas',
    items: [
      { number: '7', name: 'Kinderpizza', description: 'Kleine pizza met tomatensaus en kaas', price: 7.0 },
      { number: '8', name: 'Margherita', description: 'Tomatensaus en kaas', price: 9.0, featured: true },
      { number: '9', name: 'Napoli', description: 'Tomatensaus, kaas, ansjovis', price: 12.0 },
      { number: '10', name: 'Cipola', description: 'Tomatensaus, kaas, uien', price: 9.0 },
      { number: '11', name: 'Salami', description: 'Tomatensaus, kaas, salami', price: 11.0 },
      { number: '12', name: 'Prosciutto', description: 'Tomatensaus, kaas, ham', price: 11.0 },
      { number: '13', name: 'Funghi', description: 'Tomatensaus, kaas, champignons', price: 11.0 },
      { number: '14', name: 'Prosciutto e funghi', description: 'Tomatensaus, kaas, ham en champignons', price: 12.0 },
      { number: '15', name: 'Peperoni', description: 'Tomatensaus, kaas, paprika', price: 10.0 },
      { number: '16', name: 'Vegetarische pizza', description: 'Tomatensaus, kaas, champignons, paprika, uien en artisjokken', price: 12.0 },
      { number: '17', name: 'Pizza van het huis', description: 'Tomatensaus, kaas, salami, ham, paprika, uien, champignons en ei', price: 14.0, featured: true },
      { number: '18', name: 'Quattro Stagioni', description: 'Tomatensaus, kaas, ham, salami, paprika, champignons en olijven', price: 13.0 },
      { number: '19', name: 'Diavolo', description: 'Tomatensaus, kaas en pittige salami', price: 11.0 },
      { number: '20', name: 'Gorgonzola', description: 'Tomatensaus, kaas en gorgonzola', price: 11.0 },
      { number: '21', name: 'Quattro formaggi', description: 'Tomatensaus en vier soorten Italiaanse kaas', price: 13.0 },
      { number: '22', name: 'Hawaï', description: 'Tomatensaus, kaas, ham en ananas', price: 13.0 },
      { number: '23', name: 'Al Tonno', description: 'Tomatensaus, kaas, tonijn en uien', price: 13.0 },
      { number: '24', name: 'Marinara', description: 'Tomatensaus, kaas, diverse soorten vis', price: 14.0 },
      { number: '25', name: 'Scampi', description: 'Tomatensaus, kaas, garnalen', price: 13.0 },
      { number: '26', name: 'Bolognese', description: 'Tomatensaus, kaas, rundergehakt', price: 13.0 },
      { number: '27', name: 'Shoarma pizza', description: 'Tomatensaus, kaas, shoarmavlees', price: 13.0, featured: true },
      { number: '28', name: 'Pollo', description: 'Tomatensaus, kaas, paprika, uien, champignons en kip', price: 15.0 },
      { number: '29', name: 'Calzone speciaal', description: 'Dubbelgevouwen pizza met tomatensaus, kaas, ham, salami, paprika, uien en champignons', price: 15.0 },
      { number: '30', name: 'Shoarma pizza speciaal', description: 'Tomatensaus, kaas, paprika, uien, champignons en shoarma', price: 15.0 },
      { number: '31', name: 'Fantasia', description: 'Pizza naar eigen keuze', price: null },
    ],
  },
  {
    name: "Pasta's",
    slug: 'pastas',
    items: [
      { number: '32', name: 'Spaghetti Napolitana', description: 'Tomatensaus en kaas', price: 10.0 },
      { number: '33', name: 'Spaghetti Bolognese', description: 'Bolognesesaus en kaas', price: 13.0 },
      { number: '34', name: 'Spaghetti Tonno', description: 'Tomatensaus, tonijn en kaas', price: 13.0 },
    ],
  },
  {
    name: 'Stokbrood',
    slug: 'stokbrood',
    items: [
      { number: '35', name: 'Stokbrood met kebab', price: 10.0 },
      { number: '36', name: 'Stokbrood met kip', price: 10.0 },
      { number: '37', name: 'Stokbrood met shoarma', price: 10.0 },
    ],
  },
  {
    name: 'Schotels',
    slug: 'schotels',
    items: [
      { number: '45', name: 'Shoarma schotel', description: 'Shoarma met friet, pitabrood en salade', price: 14.0, featured: true },
      { number: '46', name: 'Shoarma speciaal', description: 'Shoarma met gebakken champignons, paprika, uien, friet, pitabrood en salade', price: 15.0 },
      { number: '47', name: 'Kip schotel', description: 'Kip met gebakken champignons, paprika, uien, friet, pitabrood en salade', price: 15.0 },
      { number: '48', name: 'Kebab schotel', description: 'Stukjes gekruid gehakt op speciale wijze bereid, met friet, pitabrood en salade', price: 15.0 },
      { number: '49', name: 'Mixed grill schotel', description: 'Shoarma, kip, döner en kebab op speciale wijze bereid met friet, pitabrood en salade', price: 27.0, featured: true },
      { number: '50', name: 'Dream schotel', description: 'Shoarma met gebakken ananas en gesmolten kaas, friet, pitabrood en salade', price: 15.0 },
      { number: '51', name: 'Cleopatra shoarma & kip', description: 'Shoarma en kip, friet, pitabrood en salade', price: 17.0 },
      { number: '52', name: 'Sphinx schotel', description: 'Kebab en shoarma met friet, pitabrood en salade', price: 17.0 },
    ],
  },
  {
    name: 'Vegetarische schotel',
    slug: 'vegetarische-schotel',
    items: [{ number: '53', name: 'Falafel schotel', description: 'Falafel met friet, pitabrood en salade', price: 13.0 }],
  },
  {
    name: 'Warme pitabroodjes',
    slug: 'warme-pitabroodjes',
    items: [
      { number: '54', name: 'Broodje shoarma', price: 7.5 },
      { number: '55', name: 'Kingsize extra shoarmavlees', price: 9.0 },
      { number: '56', name: 'Broodje shoarma kaas', price: 10.0 },
      { number: '57', name: 'Broodje shoarma hawaï', description: 'Shoarma met gesmolten kaas en ananas', price: 10.0 },
      { number: '58', name: 'Broodje kipfilet speciaal', price: 10.0 },
      { number: '59', name: 'Broodje hamburger', price: 4.0 },
      { number: '60', name: 'Broodje cheeseburger', price: 5.0 },
      { number: '61', name: 'Broodje kaas', price: 3.0 },
      { number: '62', name: 'Broodje ham-kaas', price: 3.5 },
      { number: '63', name: 'Stokbrood met kruidenboter', price: 5.0 },
      { number: '64', name: 'Broodje ham-kaas-ananas', price: 4.5 },
      { number: '65', name: 'Broodje ham-kaas-salami', price: 4.5 },
      { number: '66', name: 'Zakje friet', price: 4.5 },
    ],
  },
  {
    name: 'Dönergerechten',
    slug: 'donergerechten',
    items: [
      { number: '67', name: 'Broodje döner', description: 'Turks brood of pita', price: 8.0 },
      { number: '68', name: 'Döner schotel', description: 'Turks brood of pita', price: 15.0, featured: true },
      { number: '69', name: 'Pizza döner', description: 'Met tomatensaus, kaas en dönervlees', price: 14.0 },
      { number: '70', name: 'Kapsalon klein', price: 10.0 },
      { number: '71', name: 'Kapsalon groot', price: 15.0 },
      { number: '72', name: 'Dürüm döner', price: 8.0 },
    ],
  },
  {
    name: "Extra's",
    slug: 'extras',
    items: [
      { number: '38', name: 'Extra saus', description: 'Knoflook, tomaat, whisky, sambal', price: 1.0 },
      { number: '39', name: 'Shoarmavlees', price: 4.0 },
      { number: '40', name: 'Pitabrood', price: 1.5 },
      { number: '41', name: 'Ham of salami', price: 3.0 },
      { number: '42', name: 'Groenten', price: 2.0 },
      { number: '43', name: 'Bakje salade', price: 4.0 },
      { number: '44', name: 'Kaas', price: 3.0 },
    ],
  },
];
