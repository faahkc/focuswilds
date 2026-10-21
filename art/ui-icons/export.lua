local sprite = app.open('art/ui-icons/ui-icons.aseprite')
assert(sprite.width == 16 and sprite.height == 16 and #sprite.frames == 8)
local names = {'Check', 'Close', 'Down', 'Up', 'Clear', 'Delete', 'Shift', 'Enter'}
local base = Image(128,16,ColorMode.RGB)
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
for index=5,8 do
 local minx,miny,maxx,maxy=16,16,-1,-1
 for y=0,15 do for x=0,15 do
  if app.pixelColor.rgbaA(base:getPixel((index-1)*16+x,y))>0 then
   minx=math.min(minx,x);maxx=math.max(maxx,x);miny=math.min(miny,y);maxy=math.max(maxy,y)
  end
 end end
 assert(minx+maxx==15 and miny+maxy==15,names[index]..' must stay centered')
end
-- The approved backspace outline joins by edges; its inner cross stays separate.
local visited, pending = {}, {{6,2}}
while #pending > 0 do
 local point = table.remove(pending)
 local x,y = point[1],point[2]
 local key = y*16+x
 if x>=0 and x<16 and y>=0 and y<16 and not visited[key] and app.pixelColor.rgbaA(base:getPixel(80+x,y))>0 then
  visited[key]=true
  for _,step in ipairs({{1,0},{-1,0},{0,1},{0,-1}}) do pending[#pending+1]={x+step[1],y+step[2]} end
 end
end
for y=0,15 do for x=0,15 do
 if app.pixelColor.rgbaA(base:getPixel(80+x,y))>0 then
  local cross = x>=7 and x<=10 and y>=6 and y<=9
  assert((visited[y*16+x]==true)~=cross,'Delete outline/cross separation changed')
 end
end end
-- Enter's head and join mirror about its three-pixel shaft at y=8.
for y=3,13 do for x=0,6 do
 assert(base:getPixel(112+x,y)==base:getPixel(112+x,16-y),'Enter head/shaft symmetry changed')
end end
local atlas = Image(256,32,ColorMode.RGB)
for y=0,31 do for x=0,255 do
  atlas:drawPixel(x,y,base:getPixel(math.floor(x/2),math.floor(y/2)))
end end
local path='src/assets/ui-icons.png'
atlas:saveAs(path)
local saved=Image{fromFile=path}
assert(saved.width==256 and saved.height==32)
for y=0,31 do for x=0,255 do
  assert(saved:getPixel(x,y)==base:getPixel(math.floor(x/2),math.floor(y/2)),'Icon export differs from approved 2x scale')
end end
print('Verified eight 32px icons: exact 2x master pixels and PNG round trip')
