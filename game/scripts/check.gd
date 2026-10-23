extends SceneTree

func _initialize() -> void:
	var scene = load("res://scenes/apartment.tscn").instantiate()
	root.add_child.call_deferred(scene)
	_check.call_deferred(scene)

func _check(scene: Node) -> void:
	assert(Engine.max_fps == 30)
	assert(scene.CAT.get_size() == Vector2(24, 26))
	assert(scene.ROOM.get_size() == Vector2(224, 224))
	assert(scene.cat_target.size == Vector2(48, 52))
	assert(scene.cat.position == scene.room.position + Vector2(202, 254))
	scene._set_visible([false])
	assert(paused)
	scene._set_visible([true])
	assert(not paused)
	print("PASS: one room, exact 2x cat anchor, touch target >=44px")
	quit()
