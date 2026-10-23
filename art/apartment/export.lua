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
room:saveAs(output..'/room.png')
local animation=app.open('art/apartment/cat-reaction.aseprite')
assert(animation.width==28 and animation.height==30 and #animation.frames==14)
assert(animation.tags[1].name=='Idle' and animation.tags[2].name=='React')
local times={3200,80,100,80,2000,100,2500,80,120,100,350,80,120,150}
local unique={1,2,3,6,9,10,12}
local mapping={0,1,2,1,0,3,0,0,4,5,4,6,0,0}
local images={}
local atlas=Image(196,30,ColorMode.RGB)
local neutral=Image(28,30,ColorMode.RGB)
neutral:drawImage(cat,Point(2,2))
for i,frame in ipairs(animation.frames) do
 assert(math.abs(frame.duration*1000-times[i])<.01,'Approved timing changed')
 local image=Image(28,30,ColorMode.RGB)
 image:drawSprite(animation,i)
 images[i]=image
 for y=0,29 do for x=0,27 do
  if i==1 or y>=15 then assert(image:getPixel(x,y)==neutral:getPixel(x,y),'Approved neutral/body/feet/shadow changed') end
 end end
end
for i,n in ipairs(unique) do atlas:drawImage(images[n],Point((i-1)*28,0)) end
for i,image in ipairs(images) do for y=0,29 do for x=0,27 do
 assert(image:getPixel(x,y)==atlas:getPixel(mapping[i]*28+x,y),'Atlas timeline mismatch')
end end end
atlas:saveAs(output..'/cat-atlas.png')
local resource={'[gd_resource type="SpriteFrames" load_steps=9 format=3]\n\n[ext_resource type="Texture2D" path="res://assets/cat-atlas.png" id="1"]\n'}
for i=0,6 do
 resource[#resource+1]='\n[sub_resource type="AtlasTexture" id="Pose'..i..'"]\natlas = ExtResource("1")\nregion = Rect2('..(i*28)..', 0, 28, 30)\n'
end
resource[#resource+1]='\n[resource]\nanimations = ['
for n,tag in ipairs(animation.tags) do
 assert(tag.fromFrame.frameNumber==(n==1 and 1 or 8) and tag.toFrame.frameNumber==(n==1 and 7 or 14),'Approved tags changed')
 resource[#resource+1]=(n>1 and ', ' or '')..'{"name": &"'..tag.name..'", "loop": '..(n==1 and 'true' or 'false')..', "speed": 1000.0, "frames": ['
 for i=tag.fromFrame.frameNumber,tag.toFrame.frameNumber do
  resource[#resource+1]=(i>tag.fromFrame.frameNumber and ', ' or '')..'{"duration": '..times[i]..'.0, "texture": SubResource("Pose'..mapping[i]..'")}'
 end
 resource[#resource+1]=']}'
end
resource[#resource+1]=']\n'
local file=assert(io.open(output..'/cat-animation.tres','w'));file:write(table.concat(resource));file:close()
print('PASS: approved room recomposition, 14 animation timings, fixed feet/shadow and 7-pose atlas; hidden reference omitted')
