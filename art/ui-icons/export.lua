local output=assert(app.params['output'],'Supply --script-param output=<folder>; this exporter does not choose a deployment path')
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
local keyboard
do
local sprite=app.open('art/ui-icons/keyboard-actions.aseprite')
assert(sprite.width==10 and sprite.height==10 and #sprite.frames==4)
local names={'Shift','Delete','Enter','Clear'}
local native=Image(40,10,ColorMode.RGB)
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
for y=0,9 do for x=0,9 do assert(native:getPixel(30+x,y)==native:getPixel(39-x,y),'Clear symmetry') end end
keyboard=native
end
local atlas = Image(256,64,ColorMode.RGB)
for y=0,31 do for x=0,255 do
  atlas:drawPixel(x,y,base:getPixel(math.floor(x/2),math.floor(y/2)))
end end
for y=0,19 do for x=0,79 do
 atlas:drawPixel(x,32+y,keyboard:getPixel(math.floor(x/2),math.floor(y/2)))
end end
local path=output..'/ui-icons.png'
atlas:saveAs(path)
local saved=Image{fromFile=path}
assert(saved.width==256 and saved.height==64)
for y=0,31 do for x=0,255 do
  assert(saved:getPixel(x,y)==base:getPixel(math.floor(x/2),math.floor(y/2)),'Icon export differs from approved 2x scale')
end end
for y=0,19 do for x=0,79 do
 assert(saved:getPixel(x,32+y)==keyboard:getPixel(math.floor(x/2),math.floor(y/2)),'Keyboard export differs from approved pixels')
end end
print('PASS: eight 32px and four 20px icons share one atlas with exact 2x master pixels')
