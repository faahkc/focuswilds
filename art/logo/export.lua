local source=app.open('art/logo/black-cat.aseprite')
assert(source.width==16 and source.height==16 and #source.frames==1)
local base=Image(16,16,ColorMode.RGB)
for _,layer in ipairs(source.layers) do
 local cel=layer.cels[1]
 base:drawImage(cel.image,cel.position)
end
local exports={{16,'icon-16'},{32,'icon-32'},{48,'icon-48'},{128,'cat'},{180,'apple-touch-icon'},{192,'icon-192'},{512,'icon-512'}}
for _,export in ipairs(exports) do
 local size,name=export[1],export[2]
 local scale=math.floor(size/16)
 local offset=math.floor((size-16*scale)/2)
 local result=Image(size,size,ColorMode.RGB)
 local apple=name=='apple-touch-icon'
 result:clear(apple and base:getPixel(1,0) or 0)
 for y=0,size-1 do for x=0,size-1 do
  local bx,by=math.floor((x-offset)/scale),math.floor((y-offset)/scale)
  if bx>=0 and bx<16 and by>=0 and by<16 then
   local pixel=base:getPixel(bx,by)
   -- iOS masks its own opaque touch icon; other exports preserve cut corners.
   if not apple or app.pixelColor.rgbaA(pixel)>0 then result:drawPixel(x,y,pixel) end
  end
 end end
 local path=(name=='cat' and 'src/assets/' or 'public/')..name..'.png'
 result:saveAs(path)
 local saved=Image{fromFile=path}
 assert(saved.width==size and saved.height==size)
 assert(app.pixelColor.rgbaA(saved:getPixel(0,0))==(apple and 255 or 0))
 for y=0,size-1 do for x=0,size-1 do assert(saved:getPixel(x,y)==result:getPixel(x,y)) end end
end
print('Verified seven PNG exports from the approved single master with integer pixel scaling.')
