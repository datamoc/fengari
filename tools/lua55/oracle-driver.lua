local file = assert(io.open(arg[1], "rb"))
local source = file:read("a")
file:close()
local prefix = "@@lua55@@"
local function hex(bytes)
  return (bytes:gsub(".", function(byte) return string.format("%02x", string.byte(byte)) end))
end
local function encode(value)
  local kind = type(value)
  if kind == "nil" then return "nil" end
  if kind == "boolean" then return "boolean:" .. tostring(value) end
  if kind == "string" then return "string:" .. hex(value) end
  if kind == "number" then
    if math.type(value) == "integer" then return "integer:" .. tostring(value) end
    return "float:" .. hex(string.pack(">d", value))
  end
  error("Unsupported differential result type: " .. kind)
end
local chunk, message = load(source, "@" .. arg[2], "t", _G)
if not chunk then
  io.write(prefix, "compilation:error\n", prefix, encode(message), "\n")
else
  local results = table.pack(pcall(chunk))
  if not results[1] then
    io.write(prefix, "execution:error\n", prefix, encode(results[2]), "\n")
  else
    io.write(prefix, "execution:ok\n")
    for index = 2, results.n do io.write(prefix, encode(results[index]), "\n") end
  end
end
