/**
 * Definitions of the local demo pages served by Express and used by Demo Mode.
 * Keys map to HTML files under server/src/services/browser/demoPages/.
 * `fields` is used by the planner to tell the agent what to extract/summarise.
 */
export const demoPageSeeds = [
  {
    key: 'flights',
    name: 'Flights DEL → BOM (live demo)',
    tourType: 'flights',
    url: '/demo/flights.html',
    description: 'Live-updating flight prices & seat availability between New Delhi and Mumbai.',
    fields: ['date', 'currency', 'flights'],
  },
  {
    key: 'hotels',
    name: 'Hotels Goa (live demo)',
    tourType: 'hotels',
    url: '/demo/hotels.html',
    description: 'Live-updating hotel prices, ratings and room availability in Goa.',
    fields: ['date', 'currency', 'hotels'],
  },
];

export default demoPageSeeds;
