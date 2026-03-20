const fetch = require('node-fetch');

const STATE_MAP = {
  'ახალი რემონტით': 1, 'ძველი რემონტით': 2, 'თეთრი კარკასი': 3,
  'მწვანე კარკასი': 4, 'შავი კარკასი': 5, 'სარემონტო': 6, 'მიმდინარე რემონტი': 7
};

async function scrape_ss(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ka,en;q=0.5',
      }
    });

    const html = await response.text();
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match) return null;

    const nextData = JSON.parse(match[1]);
    const listing = nextData?.props?.pageProps?.applicationData;
    if (!listing) return null;

    // FIX: სურათების სრული URL — fileName-ს შეიძლება სრული URL ჰქონდეს ან ფაილის სახელი
    const images = listing.appImages || [];
    const files = images
      .sort((a, b) => (a.orderNo || 0) - (b.orderNo || 0))
      .map(img => img.fileName)
      .filter(Boolean);

    const address = listing.address || {};
    const desc = listing.description || {};
    const price = listing.price || {};

    let stateNum = listing.stateId || listing.state;
    if (typeof stateNum === 'string' && STATE_MAP[stateNum]) stateNum = STATE_MAP[stateNum];
    else if (stateNum) stateNum = parseInt(stateNum);

    const projectNum = (listing.projectId || listing.project)
      ? parseInt(listing.projectId || listing.project) : null;

    // FIX: totalFloors — SS.GE-ზე 'floors' და 'totalFloors' ორივე შეიძლება
    const totalFloors = listing.totalFloors || listing.floors || listing.floorQuantity || null;

    // FIX: აღწერა — მრავალი შესაძლო field
    const descriptionGe = desc.ka || desc.ge || desc.text || listing.descriptionGe || listing.description || '';

    const template = {
      realEstateDealTypeId: listing.realEstateDealTypeId,
      realEstateTypeId: listing.realEstateTypeId,
      cityId: address.cityId,
      districtId: address.districtId || null,
      subdistrictId: address.subdistrictId || null,
      streetId: address.streetId,
      streetNumber: address.streetNumber || '',
      totalArea: listing.totalArea ? parseFloat(listing.totalArea) : null,
      areaOfHouse: listing.areaOfHouse ? parseFloat(listing.areaOfHouse) : null,
      kitchenArea: listing.kitchenArea ? parseFloat(listing.kitchenArea) : null,
      floor: listing.floor ? parseInt(listing.floor) : null,
      // FIX: სართულების რაოდენობა
      totalFloors: totalFloors ? parseInt(totalFloors) : null,
      rooms: listing.rooms ? parseInt(listing.rooms) : null,
      bedrooms: listing.bedrooms ? parseInt(listing.bedrooms) : null,
      toilet: listing.toilet ? parseInt(listing.toilet) : null,
      balcony_Loggia: listing.balcony_Loggia ? parseInt(listing.balcony_Loggia) : null,
      // FIX: ფასი არ გადმოდის
      // priceUsd და priceGeo წაშლილია მომხმარებლის მოთხოვნით
      currencyType: price.currencyType || 2,
      // FIX: აღწერა
      descriptionGe: descriptionGe,
      descriptionEn: desc.en || descriptionGe,
      descriptionRu: desc.ru || descriptionGe,
      realEstateStatusId: listing.realEstateStatusId || null,
      state: stateNum !== null && !isNaN(stateNum) ? stateNum : undefined,
      project: projectNum !== null && !isNaN(projectNum) ? projectNum : undefined,
      floorType: listing.floorType || 0,
      commercialType: listing.commercialType || 0,
      balcony: listing.balcony || false,
      elevator: listing.elevator || false,
      furniture: listing.furniture || false,
      airConditioning: listing.airConditioning || false,
      internet: listing.internet || false,
      heating: listing.heating || false,
      hotWater: listing.hotWater || false,
      naturalGas: listing.naturalGas || false,
      garage: listing.garage || false,
      storage: listing.storage || false,
      tv: listing.tv || false,
      fridge: listing.fridge || false,
      washingMachine: listing.washingMachine || false,
      cableTelevision: listing.cableTelevision || false,
      telephone: listing.telephone || false,
      securityAlarm: listing.securityAlarm || false,
      ironDoor: listing.ironDoor || false,
      glazedWindows: listing.glazedWindows || false,
      withPool: listing.withPool || false,
      isPetFriendly: listing.isPetFriendly || false,
      comfortable: listing.comfortable || false,
      light: listing.light || false,
      viewOnYard: listing.viewOnYard || false,
      viewOnStreet: listing.viewOnStreet || false,
      locationLatitude: listing.locationLatitude || null,
      locationLongitude: listing.locationLongitude || null,
      isManualPin: listing.isManualPin || false,
      phoneNumbers: [{ phoneNumber: '' }],
    };

    const title = listing.title || descriptionGe?.substring(0, 60) || 'Statement';
    return { template, files, title };
  } catch (e) {
    console.error('SS Scrape error:', e.message);
    return null;
  }
}

module.exports = { scrape_ss };
