import test from 'node:test';
import assert from 'node:assert/strict';
import { accommodationSnapshot, changedAccommodationFields, accommodationDetailsPayload, saveAccommodationSections, validateAccommodation } from '../src/lib/admin/accommodation-form.ts';
const form = { name:'River Camp', slug:'river-camp', currency:'USD', recommended_nights:'3', latitude:'-2.4', longitude:'35.2', romantic_rating:'8.5' };
const details = () => ({highlights:[{title:'River views'}],rooms:[{id:'room-1', name:'Family tent',max_guests:4,unit_count:'',lodge_room_images:[{image_url:'https://example.com/a.jpg',caption:'Original caption',alt_text:'Family tent'}]}],rates:[{season_name:'Green season',currency:'USD',rack_rate:0,net_rate:125.5,notes:'Private commercial notes'}],inclusions:[{title:'Meals',is_included:true}]});
test('opening an incomplete legacy record does not create false unsaved changes',()=>{
 assert.equal(accommodationSnapshot({name:'Room',max_guests:4,unit_count:null}),accommodationSnapshot({name:'Room',max_guests:'4',unit_count:'',max_children:'',short_description:''}));
 assert.notEqual(accommodationSnapshot({title:'Original'}),accommodationSnapshot({title:''}));
});
test('no-op and name-only edits do not rewrite other property fields',()=>{
 const initial={name:'River Camp',settings:['custom_setting'],indexable:false,minimum_child_age:null};
 assert.deepEqual(changedAccommodationFields(initial,structuredClone(initial)),{});
 assert.deepEqual(changedAccommodationFields(initial,{...initial,name:'Updated camp'}),{name:'Updated camp'});
});
test('explicit clears and false switches remain intentional changes',()=>{
 assert.deepEqual(changedAccommodationFields({description:'Old',show_rates_publicly:true},{description:null,show_rates_publicly:false}),{description:null,show_rates_publicly:false});
});
test('details retain private rates, zero prices, room images and captions without mutating source',()=>{
 const source=details(), before=structuredClone(source), payload=accommodationDetailsPayload(source);
 assert.equal(payload.rates[0].net_rate,125.5);assert.equal(payload.rates[0].rack_rate,0);assert.equal(payload.rates[0].notes,'Private commercial notes');
 assert.equal(payload.rooms[0].images[0].caption,'Original caption');assert.equal(payload.rooms[0].unit_count,null);assert.deepEqual(source,before);
});
test('valid decimal scores and blank optional numbers are accepted',()=>{
 assert.deepEqual(validateAccommodation({...form,price_per_night_from:'0',minimum_child_age:''},details()),[]);
});
test('validation routes invalid coordinates and scores to their own sections',()=>{
 const errors=validateAccommodation({...form,latitude:'95',family_rating:'11'});
 assert.equal(errors.find(e=>e.field==='latitude').section,'location');assert.equal(errors.find(e=>e.field==='family_rating').section,'guests');
});
test('blank room names and invalid dates are not silently filtered out',()=>{
 const d=details();d.rooms[0].name='';d.rates[0].valid_from='2026-10-04';d.rates[0].valid_until='2026-01-01';
 const errors=validateAccommodation(form,d);assert.ok(errors.some(e=>e.field==='room_name_0'));assert.ok(errors.some(e=>e.field==='rate_until_0'));
});
test('room capacity and empty photo slots are checked before saving',()=>{
 const d=details();d.rooms[0].max_guests=-1;d.rooms[0].lodge_room_images=[{image_url:''}];
 assert.equal(validateAccommodation(form,d).length,2);
});
test('no dirty sections make no write calls',async()=>{assert.deepEqual(await saveAccommodationSections({}),{completed:[],failed:null,error:null});});
test('name-only save never touches gallery or details',async()=>{
 const calls=[];await saveAccommodationSections({property:async()=>{calls.push('property')}});assert.deepEqual(calls,['property']);
});
test('partial failure reports successful sections and stops subsequent writes',async()=>{
 const calls=[];const result=await saveAccommodationSections({property:async()=>{calls.push('property')},gallery:async()=>{calls.push('gallery');throw Error('Offline')},details:async()=>{calls.push('details')}});
 assert.deepEqual(calls,['property','gallery']);assert.deepEqual(result.completed,['property']);assert.equal(result.failed,'gallery');
});
test('retry can save just the unfinished section',async()=>{
 const result=await saveAccommodationSections({gallery:async()=>{}});assert.deepEqual(result.completed,['gallery']);assert.equal(result.failed,null);
});
