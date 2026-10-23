extends Node2D

const ROOM = preload("res://assets/room.png")
const CAT = preload("res://assets/cat.png")
const CAT_ORIGIN = Vector2(101, 127)
const PIXEL_SCALE = 2.0

var room := Sprite2D.new()
var cat := Sprite2D.new()
var cat_target := Rect2()
var pet_callback: JavaScriptObject
var visible_callback: JavaScriptObject
var window: JavaScriptObject

func _ready() -> void:
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	for sprite in [room, cat]:
		sprite.centered = false
		sprite.scale = Vector2.ONE * PIXEL_SCALE
		add_child(sprite)
	room.texture = ROOM
	cat.texture = CAT
	if OS.has_feature("web"):
		window = JavaScriptBridge.get_interface("window")
		pet_callback = JavaScriptBridge.create_callback(_pet_cat)
		visible_callback = JavaScriptBridge.create_callback(_set_visible)
		window.focuswildsPetCat = pet_callback
		window.focuswildsSetVisible = visible_callback
	get_viewport().size_changed.connect(_frame_scene)
	_frame_scene()

func _frame_scene() -> void:
	var size := get_viewport_rect().size
	room.position = ((size - Vector2(448, 448)) / 2.0).floor()
	cat.position = room.position + CAT_ORIGIN * PIXEL_SCALE
	cat_target = Rect2(cat.position, Vector2(48, 52))
	if window:
		window.focuswildsSceneReady.call(null, cat_target.position.x, cat_target.position.y, cat_target.size.x, cat_target.size.y)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		if cat_target.has_point(event.position):
			_pet_cat([])

func _pet_cat(_arguments: Array) -> void:
	if window:
		window.focuswildsCatNotice.call()

func _set_visible(arguments: Array) -> void:
	var active: bool = arguments[0]
	get_tree().paused = not active
	RenderingServer.render_loop_enabled = active
	if window:
		window.focuswildsGraphicsState.call(null, active)

