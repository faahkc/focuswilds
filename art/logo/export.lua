local source=app.open('art/logo/black-cat.aseprite')
assert(source.width==16 and source.height==16 and #source.frames==1)
local base=Image(16,16,ColorMode.RGB)
local ink=Image(16,16,ColorMode.RGB)
for index,layer in ipairs(source.layers) do
 local cel=layer:cel(1)
 base:drawImage(cel.image,cel.position)
 if index>1 then ink:drawImage(cel.image,cel.position) end
end
local cream=base:getPixel(1,0)
local exports={{16,'icon-16'},{32,'icon-32'},{48,'icon-48'},{180,'apple-touch-icon'},{192,'icon-192'},{512,'icon-512'}}
for _,export in ipairs(exports) do
 local size,name=export[1],export[2]
 local appIcon=size>=180
 local art=appIcon and ink or base
 -- The reviewed app crop uses integer pixels with at least eight pixels of clearance.
 local scale=math.floor(size*(appIcon and 0.92 or 1)/16)
 local offset=math.floor((size-16*scale)/2)
 assert(scale>=1 and (not appIcon or offset>=8),'App edge clearance')
 local result=Image(size,size,ColorMode.RGB)
 local apple=name=='apple-touch-icon'
 result:clear(appIcon and cream or 0)
 for y=0,16*scale-1 do for x=0,16*scale-1 do
  local pixel=art:getPixel(math.floor(x/scale),math.floor(y/scale))
  if app.pixelColor.rgbaA(pixel)>0 then result:drawPixel(x+offset,y+offset,pixel) end
 end end
 -- iOS masks its own opaque touch icon; other app exports retain one cut corner pixel.
 if appIcon and not apple then
  for y=0,scale-1 do for x=0,scale-1 do
   result:drawPixel(x,y,0);result:drawPixel(size-1-x,y,0)
   result:drawPixel(x,size-1-y,0);result:drawPixel(size-1-x,size-1-y,0)
  end end
 end
 for y=0,15 do for x=0,15 do
  local pixel=art:getPixel(x,y)
  if app.pixelColor.rgbaA(pixel)>0 then
   assert(result:getPixel(offset+x*scale,offset+y*scale)==pixel,'Scaled cat pixels changed')
  end
 end end
 local path='public/'..name..'.png'
 result:saveAs(path)
 local saved=Image{fromFile=path}
 assert(saved.width==size and saved.height==size)
 assert(app.pixelColor.rgbaA(saved:getPixel(0,0))==(apple and 255 or 0))
 for y=0,size-1 do for x=0,size-1 do assert(saved:getPixel(x,y)==result:getPixel(x,y)) end end
end
print('Verified six exports: unchanged favicons, reviewed larger app crop, identical cat pixels and integer scaling')
