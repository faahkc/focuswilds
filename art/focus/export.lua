local css={'/* Generated from the approved focus Aseprite masters. */'}
for _,spec in ipairs({{'city-walk',128,144,32,'.focus-city-art','focus-city'}, {'city-walk-compact',128,80,32,nil,nil}, {'player-walk',20,36,8,'.focus-city-player','focus-player'}}) do
 local name,w,h,count,selector,animation=table.unpack(spec)
 local sprite=app.open('art/focus/'..name..'.aseprite')
 assert(sprite.width==w and sprite.height==h and #sprite.frames==count,'Approved grid/frame count changed')
 local atlas=Image(w*count,h,ColorMode.RGB)
 local duration=0
 for i,frame in ipairs(sprite.frames) do
  assert(math.abs(frame.duration-.12)<.0001,'Approved animation timing changed')
  for _,layer in ipairs(sprite.layers) do
   local cel=layer:cel(i)
   if cel and layer.name ~= "Player walk" then atlas:drawImage(cel.image,Point((i-1)*w+cel.position.x,cel.position.y)) end
  end
  duration=duration+frame.duration
 end
 local path='src/assets/'..name..'-atlas.png'
 atlas:saveAs(path)
 local saved=Image{fromFile=path}
 for y=0,h-1 do for x=0,w*count-1 do assert(saved:getPixel(x,y)==atlas:getPixel(x,y),'PNG round trip differs') end end
 if selector then
  css[#css+1]=selector..' { background-image: url("./'..name..'-atlas.png"); background-size: '..count*100 ..'% 100%; animation: '..animation..' '..math.floor(duration*1000+.5)..'ms step-end infinite; }'
  css[#css+1]='@keyframes '..animation..' {'
  for i=0,count-1 do css[#css+1]=string.format(' %.6f%% { background-position: %.6f%% 0; }',i/count*100,i/(count-1)*100) end
  css[#css+1]='}'
 end
end
css[#css+1]='@container focus-city (min-aspect-ratio: 13/10) { .focus-city-art { background-image: url("./city-walk-compact-atlas.png"); } }'
local file=assert(io.open('src/assets/focus-city.css','w'));file:write(table.concat(css,'\n')..'\n');file:close()
print('PASS: approved focus grids/timing and atlas PNG round trips')
