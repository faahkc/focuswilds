local sprite = app.open('art/ui-icons/ui-icons.aseprite')
assert(sprite.width == 16 and sprite.height == 16 and #sprite.frames == 4)
local names = {'Check', 'Close', 'Down', 'Up'}
local atlas = Image(64,16,ColorMode.RGB)
for index,name in ipairs(names) do
  local tag = sprite.tags[index]
  assert(tag.name == name and tag.fromFrame.frameNumber == index and tag.toFrame.frameNumber == index, name..': '..tag.name..' '..tostring(tag.fromFrame.frameNumber)..'-'..tostring(tag.toFrame.frameNumber))
  for _,layer in ipairs(sprite.layers) do
    local cel = layer:cel(index)
    if cel then atlas:drawImage(cel.image, Point((index-1)*16+cel.position.x,cel.position.y)) end
  end
end
-- Each approved icon uses complete 2x2 cells; reject accidental subpixel edits.
for y=0,15,2 do for x=0,63,2 do
  local pixel = atlas:getPixel(x,y)
  for dy=0,1 do for dx=0,1 do assert(atlas:getPixel(x+dx,y+dy) == pixel) end end
end end
atlas:saveAs('src/assets/ui-icons.png')
