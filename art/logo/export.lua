local source=app.open('art/logo/black-cat.aseprite')
assert(source.width==16 and source.height==16 and #source.frames==1)
local base=Image(16,16,ColorMode.RGB)
for _,layer in ipairs(source.layers) do
 local cel=layer.cels[1]
 base:drawImage(cel.image,cel.position)
end
-- Build the reviewed app composition from the same cat, with one native pixel of padding.
local padded=Sprite(18,18,ColorMode.RGB)
padded.layers[1].name='Cream background with one-pixel cut corners'
local cream=base:getPixel(1,0)
local background=Image(18,18,ColorMode.RGB);background:clear(cream)
for _,point in ipairs({{0,0},{17,0},{0,17},{17,17}}) do background:drawPixel(point[1],point[2],0) end
padded.layers[1]:cel(1).image=background
for n=2,#source.layers do
 local layer=padded:newLayer();layer.name=source.layers[n].name
 local cel=source.layers[n]:cel(1)
 padded:newCel(layer,1,cel.image,Point(cel.position.x+1,cel.position.y+1))
end
padded:saveAs('art/logo/app-icon.aseprite')
local appBase=Image(18,18,ColorMode.RGB)
for _,layer in ipairs(padded.layers) do local cel=layer:cel(1);appBase:drawImage(cel.image,cel.position) end
for y=0,15 do for x=0,15 do
 local pixel=base:getPixel(x,y)
 if app.pixelColor.rgbaA(pixel)>0 then assert(pixel==appBase:getPixel(x+1,y+1),'App cat differs from master') end
end end
local exports={{16,'icon-16'},{32,'icon-32'},{48,'icon-48'},{180,'apple-touch-icon'},{192,'icon-192'},{512,'icon-512'}}
for _,export in ipairs(exports) do
 local size,name=export[1],export[2]
 local appIcon=size>=180
 local art=appIcon and appBase or base
 local scale=math.floor(size/art.width)
 local offset=math.floor((size-art.width*scale)/2)
 local result=Image(size,size,ColorMode.RGB)
 local apple=name=='apple-touch-icon'
 result:clear(appIcon and cream or 0)
 for y=0,size-1 do for x=0,size-1 do
  local bx,by=math.floor((x-offset)/scale),math.floor((y-offset)/scale)
  if bx>=0 and bx<art.width and by>=0 and by<art.height then
   local pixel=art:getPixel(bx,by)
   if app.pixelColor.rgbaA(pixel)>0 then result:drawPixel(x,y,pixel) end
  end
 end end
 -- iOS masks its own opaque touch icon; other app exports retain one cut corner pixel.
 if appIcon and not apple then
  for y=0,scale-1 do for x=0,scale-1 do
   result:drawPixel(x,y,0);result:drawPixel(size-1-x,y,0)
   result:drawPixel(x,size-1-y,0);result:drawPixel(size-1-x,size-1-y,0)
  end end
 end
 if appIcon then
  local catOffset=offset+scale
  assert(catOffset>=scale,'Missing app icon margin')
  for y=0,15 do for x=0,15 do
   local pixel=base:getPixel(x,y)
   if app.pixelColor.rgbaA(pixel)>0 then
    assert(result:getPixel(catOffset+x*scale,catOffset+y*scale)==pixel,'Scaled cat pixels changed')
   end
  end end
 end
 local path='public/'..name..'.png'
 result:saveAs(path)
 local saved=Image{fromFile=path}
 assert(saved.width==size and saved.height==size)
 assert(app.pixelColor.rgbaA(saved:getPixel(0,0))==(apple and 255 or 0))
 for y=0,size-1 do for x=0,size-1 do assert(saved:getPixel(x,y)==result:getPixel(x,y)) end end
end
print('Verified six exports: original small favicons, reviewed 18x18 app composition, identical cat pixels and integer scaling.')
