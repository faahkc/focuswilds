local out=assert(app.params.output,'Supply an explicit output folder')
assert(out~='','Supply a nonempty output folder')
local specifications={{'departure-player',64,64,25,'player-atlas'},{'door-swing',64,80,7,'door-atlas'},{'shadow',24,6,1,'shadow'}}
for _,spec in ipairs(specifications) do
 local sprite=app.open('art/apartment/departure/'..spec[1]..'.aseprite')
 assert(sprite.width==spec[2] and sprite.height==spec[3] and #sprite.frames==spec[4],'Reviewed departure dimensions/frame count changed')
 local atlas=Image(spec[2]*spec[4],spec[3],ColorMode.RGB)
 for i=1,spec[4] do atlas:drawSprite(sprite,i,Point((i-1)*spec[2],0)) end
 atlas:saveAs(out..'/'..spec[5]..'.png')
 sprite:close()
end
print('PASS: reviewed departure poses, door poses and shadow exported without implicit runtime writes')
