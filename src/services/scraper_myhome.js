async function scrape_myhome(url, next_data, owner_phone) {
  try {
    const data = typeof next_data === 'string' ? JSON.parse(next_data) : next_data;
    const queries = data?.props?.pageProps?.dehydratedState?.queries || [];

    let statement = null;
    for (const q of queries) {
      const d = q?.state?.data?.data;
      if (d?.statement) { statement = d.statement; break; }
      if (d?.id && d?.price) { statement = d; break; }
    }

    if (!statement) throw new Error('განცხადების მონაცემები ვერ მოიძებნა');

    const images = statement.images || statement.photos || [];
    const files = images
      .sort((a, b) => (a.order_date || 0) - (b.order_date || 0))
      .map(img => img.url || img.large || img.thumb)
      .filter(Boolean);

    const template = {
      deal_type_id: statement.deal_type?.id || statement.deal_type_id,
      estate_type_id: statement.estate_type?.id || statement.estate_type_id,
      city_id: statement.city?.id || statement.city_id,
      district_id: statement.district?.id || statement.district_id,
      street_id: statement.street?.id || statement.street_id,
      street_number: statement.street_number || statement.address,
      floor: statement.floor,
      total_floors: statement.total_floors || statement.floors,
      rooms: statement.rooms,
      bedrooms: statement.bedrooms,
      area: statement.area,
      yard_area: statement.yard_area,
      price: statement.price,
      currency_id: statement.currency_id || 1,
      description_ka: statement.description?.ka || statement.description,
      description_en: statement.description?.en || '',
      description_ru: statement.description?.ru || '',
      has_parking: statement.params?.find(p => p.key === 'has_parking')?.value || false,
      has_elevator: statement.params?.find(p => p.key === 'has_elevator')?.value || false,
      has_storage: statement.params?.find(p => p.key === 'has_storage')?.value || false,
      has_balcony: statement.params?.find(p => p.key === 'has_balcony')?.value || false,
      is_new_building: statement.is_new_building || false,
      owner_phone: owner_phone,
      lat: statement.lat || statement.map_lat,
      lng: statement.lng || statement.map_lng,
    };

    const title = statement.description?.ka?.substring(0, 60) || `განცხადება #${statement.id}`;
    return { template, files, title };
  } catch (e) {
    console.error('Myhome Scrape error:', e.message);
    return null;
  }
}

module.exports = { scrape_myhome };
