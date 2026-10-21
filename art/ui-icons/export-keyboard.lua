local sprite=app.open('art/ui-icons/keyboard-actions.aseprite')
assert(sprite.width==10 and sprite.height==10 and #sprite.frames==3)
local names={'Shift','Delete','Enter'}
local native=Image(30,10,ColorMode.RGB)
for index,name in ipairs(names) do
 local tag=sprite.tags[index]
 assert(tag.name==name and tag.fromFrame.frameNumber==index and tag.toFrame.frameNumber==index,'Static icon tags changed')
 for _,layer in ipairs(sprite.layers) do
  local cel=layer:cel(index)
  if cel then native:drawImage(cel.image,Point((index-1)*10+cel.position.x,cel.position.y)) end
 end
 local minx,miny,maxx,maxy=10,10,-1,-1
 for y=0,9 do for x=0,9 do
  if app.pixelColor.rgbaA(native:getPixel((index-1)*10+x,y))>0 then
   minx=math.min(minx,x);maxx=math.max(maxx,x);miny=math.min(miny,y);maxy=math.max(maxy,y)
  end
 end end
 assert(minx+maxx==9 and miny+maxy==9,name..' must stay centered')
end
for y=0,9 do for x=0,9 do assert(native:getPixel(x,y)==native:getPixel(9-x,y),'Shift symmetry') end end
for y=2,8 do for x=0,4 do assert(native:getPixel(20+x,y)==native:getPixel(20+x,10-y),'Enter head/shaft symmetry') end end
local atlas=Image(60,20,ColorMode.RGB)
for y=0,19 do for x=0,59 do atlas:drawPixel(x,y,native:getPixel(math.floor(x/2),math.floor(y/2))) end end
atlas:saveAs('src/assets/keyboard-actions.png')
local saved=Image{fromFile='src/assets/keyboard-actions.png'}
for y=0,19 do for x=0,59 do assert(saved:getPixel(x,y)==atlas:getPixel(x,y),'PNG round trip') end end
print('PASS: centered icons, symmetric Shift/Enter and exact 2x PNG export')
