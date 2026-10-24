local out=assert(app.params.output,'Supply an explicit output folder')
assert(out~='','Supply a nonempty output folder')
local sprite=app.open('art/apartment/close-camera/apartment.aseprite')
assert(sprite.width==384 and sprite.height==768,'Unexpected approved apartment dimensions')
local groups={
 {'background',0,{1,2,3}},
 {'door',46,{4}},
 {'desk',55,{5}},
 {'chair-seat',76,{6}},
 {'seated',77,{7}},
 {'chair-front',80,{8}},
 {'bed',113,{9}},
 {'care',120,{10}},
 {'cat',148,{11}},
}
assert(#sprite.layers==11,'Review changed apartment layers before exporting')
for i,fragment in ipairs({'Continuous','shared lounge','smaller window','visible apartment entrance','complete desk','chair seat','seated human','chair back','foreground human bed','separate cat bed','Approved mascot'}) do
 assert(sprite.layers[i].name:find(fragment,1,true),'Approved layer order changed: '..fragment)
end
local metadata={'{"width":384,"height":768,"parts":['}
local rebuilt=Image(384,768,ColorMode.RGB)
for i,group in ipairs(groups) do
 local merged=Image(384,768,ColorMode.RGB)
 for _,index in ipairs(group[3]) do local cel=assert(sprite.layers[index]:cel(1));merged:drawImage(cel.image,cel.position) end
 rebuilt:drawImage(merged)
 local x0,y0,x1,y1=384,768,-1,-1
 for y=0,767 do for x=0,383 do if app.pixelColor.rgbaA(merged:getPixel(x,y))>0 then x0=math.min(x0,x);y0=math.min(y0,y);x1=math.max(x1,x);y1=math.max(y1,y) end end end
 assert(x1>=x0 and y1>=y0,'Empty approved layer group: '..group[1])
 local image=Image(x1-x0+1,y1-y0+1,ColorMode.RGB);image:drawImage(merged,Point(-x0,-y0));image:saveAs(out..'/'..group[1]..'.png')
 metadata[#metadata+1]=(i>1 and ',' or '')..string.format('{"name":"%s","depth":%d,"x":%d,"y":%d,"width":%d,"height":%d}',group[1],group[2],x0,y0,image.width,image.height)
end
local approved=Image(384,768,ColorMode.RGB);approved:drawSprite(sprite,1)
for y=0,767 do for x=0,383 do assert(rebuilt:getPixel(x,y)==approved:getPixel(x,y),'Layer exports changed approved composition') end end
metadata[#metadata+1]=']}'
local file=assert(io.open(out..'/apartment.json','w'));file:write(table.concat(metadata));file:close()
print('PASS: nine trimmed groups reconstruct every approved apartment pixel')
