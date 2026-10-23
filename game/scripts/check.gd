extends SceneTree

func _initialize() -> void:
	var scene = load("res://scenes/apartment.tscn").instantiate()
	root.add_child.call_deferred(scene)
	_check.call_deferred(scene)

func _check(scene: Node) -> void:
	assert(Engine.max_fps == 30)
	assert(scene.CAT.get_frame_count(&"Idle") == 7)
	assert(scene.CAT.get_frame_count(&"React") == 7)
	assert(scene.CAT.get_animation_loop(&"Idle"))
	assert(not scene.CAT.get_animation_loop(&"React"))
	assert(scene.CAT.get_frame_texture(&"Idle", 0).get_size() == Vector2(28, 30))
	assert(scene.ROOM.get_size() == Vector2(224, 224))
	assert(scene.cat_target.size == Vector2(48, 52))
	assert(scene.cat.position == scene.room.position + Vector2(198, 250))
	assert(scene.cat_target.position == scene.room.position + Vector2(202, 254))
	var idle_seconds := 0.0
	var react_seconds := 0.0
	for i in range(7):
		idle_seconds += scene.CAT.get_frame_duration(&"Idle", i) / scene.CAT.get_animation_speed(&"Idle")
		react_seconds += scene.CAT.get_frame_duration(&"React", i) / scene.CAT.get_animation_speed(&"React")
	assert(is_equal_approx(idle_seconds, 8.06) and is_equal_approx(react_seconds, 1.0))
	scene._pet_cat([])
	assert(scene.cat.animation == &"React")
	await create_timer(0.2).timeout
	var frame: int = scene.cat.frame
	var progress: float = scene.cat.frame_progress
	scene._pet_cat([])
	assert(scene.cat.frame == frame and scene.cat.frame_progress == progress)
	scene._set_visible([false])
	assert(paused)
	await create_timer(0.25).timeout
	assert(scene.cat.frame == frame and scene.cat.frame_progress == progress)
	scene._set_visible([true])
	assert(not paused)
	await create_timer(1.1).timeout
	assert(scene.cat.animation == &"Idle")
	print("PASS: approved animation timing, duplicate reaction guard, paused frame/progress, idle return and fixed 2x anchors")
	quit()
