local output=assert(app.params.output,'Supply --script-param output=<folder>')
local sp=app.open('art/apartment/apartment.aseprite')
assert(sp.width==224 and sp.height==224 and #sp.frames==1)
local room=Image(224,224,ColorMode.RGB)
local approved=Image(224,224,ColorMode.RGB)
local mascot
for _,layer in ipairs(sp.layers) do
 if layer.isVisible then
  local cel=layer:cel(1)
  if cel then
   approved:drawImage(cel.image,cel.position)
   if layer.name=='Mascot - same approved face and floor anchor' then mascot=cel
   else room:drawImage(cel.image,cel.position) end
  end
 end
end
assert(mascot,'Missing mascot layer')
local bounds={224,224,-1,-1}
for y=0,mascot.image.height-1 do for x=0,mascot.image.width-1 do
 if app.pixelColor.rgbaA(mascot.image:getPixel(x,y))>0 then
  local xx,yy=x+mascot.position.x,y+mascot.position.y
  bounds[1]=math.min(bounds[1],xx);bounds[2]=math.min(bounds[2],yy)
  bounds[3]=math.max(bounds[3],xx);bounds[4]=math.max(bounds[4],yy)
 end
end end
assert(bounds[1]==101 and bounds[2]==127 and bounds[3]==124 and bounds[4]==152,'Cat bounds: '..table.concat(bounds,','))
local cat=Image(24,26,ColorMode.RGB)
cat:drawImage(mascot.image,Point(mascot.position.x-101,mascot.position.y-127))
local rebuilt=Image(room)
rebuilt:drawImage(cat,Point(101,127))
for y=0,223 do for x=0,223 do
 assert(rebuilt:getPixel(x,y)==approved:getPixel(x,y),'Split exports must preserve every approved pixel')
end end
room:saveAs(output..'/room.png');cat:saveAs(output..'/cat.png')
print('PASS: approved room/cat split, 50,176 recomposed pixels match; hidden reference omitted')
