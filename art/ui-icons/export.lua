local sprite = app.open('art/ui-icons/ui-icons.aseprite')
assert(sprite.width == 16 and sprite.height == 16 and #sprite.frames == 6)
local names = {'Check', 'Close', 'Down', 'Up', 'Clear', 'Delete'}
local base = Image(96,16,ColorMode.RGB)
for index,name in ipairs(names) do
  local tag = sprite.tags[index]
  assert(tag.name == name and tag.fromFrame.frameNumber == index and tag.toFrame.frameNumber == index, name..': '..tag.name..' '..tostring(tag.fromFrame.frameNumber)..'-'..tostring(tag.toFrame.frameNumber))
  for _,layer in ipairs(sprite.layers) do
    local cel = layer:cel(index)
    if cel then base:drawImage(cel.image, Point((index-1)*16+cel.position.x,cel.position.y)) end
  end
end
-- Preserve the original four icons' complete 2x2 source cells.
for y=0,15,2 do for x=0,63,2 do
  local pixel = base:getPixel(x,y)
  for dy=0,1 do for dx=0,1 do assert(base:getPixel(x+dx,y+dy) == pixel) end end
end end
for index=5,6 do
 local minx,miny,maxx,maxy=16,16,-1,-1
 for y=0,15 do for x=0,15 do
  if app.pixelColor.rgbaA(base:getPixel((index-1)*16+x,y))>0 then
   minx=math.min(minx,x);maxx=math.max(maxx,x);miny=math.min(miny,y);maxy=math.max(maxy,y)
  end
 end end
 assert(minx+maxx==15 and miny+maxy==15,names[index]..' must stay centered')
end
local atlas = Image(192,32,ColorMode.RGB)
for y=0,31 do for x=0,191 do
  atlas:drawPixel(x,y,base:getPixel(math.floor(x/2),math.floor(y/2)))
end end
local path='src/assets/ui-icons.png'
atlas:saveAs(path)
local saved=Image{fromFile=path}
assert(saved.width==192 and saved.height==32)
for y=0,31 do for x=0,191 do
  assert(saved:getPixel(x,y)==base:getPixel(math.floor(x/2),math.floor(y/2)),'Icon export differs from approved 2x scale')
end end
print('Verified six 32px icons: exact 2x master pixels and PNG round trip')
