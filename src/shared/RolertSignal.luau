--todo: add memory debug features
--todo: when adding signal by name, check if name exists
--todo: wally package
--todo: wait() should return a value

local dict = require(script.Parent.dict)
local RolertConnection = require(script.Parent.RolertConnection)
local connectionIdCount = 0
local signalIdCount = 0

local totalConnections: { [number]: pRolertConnection | RBXScriptConnection } = {}
local totalSignals: { [number]: pRolertSignal<any> } = {}

function killConnection(signal: pRolertSignal<any>, id: number)
	local conn = totalConnections[id]
	if typeof(conn) == "RBXScriptConnection" then
		conn:Disconnect()
	elseif conn then
		conn:Destroy()
	end
	table.remove(totalConnections, id)
	table.remove(signal.connections, id)
end

function registerConnection(signal: pRolertSignal<any>, conn: pRolertConnection | RBXScriptConnection, name: string?)
	if typeof(conn) == "RBXScriptConnection" then
		totalConnections[connectionIdCount] = conn
		signal.connections[connectionIdCount] = conn
		return connectionIdCount
	else
		totalConnections[conn.id] = conn
		signal.connections[conn.id] = conn
		return conn.id
	end
end

local module = {}
module.__index = module
module.__newindex = function(_)
	error("signal is readonly !")
end

function module.new<T...>(Name: string?): RolertSignal<T...>
	signalIdCount = signalIdCount + 1

	local signal = {
		alive = true,
		name = Name or " signal #" .. tostring(signalIdCount) .. " from " .. script.Name,
		id = signalIdCount,
		middlewares = {},
		connections = {},
		attachedSignals = {},
	}

	local res: RolertSignal<T...> = setmetatable(signal, module) :: any

	totalSignals[signalIdCount] = res :: any

	return res :: RolertSignal<T...>
end

function module:Alert<T>(...: T): number?
	self = self :: pRolertSignal<T>
	if not self.alive then
		return warn("cannot fire dispatched signal")
	end

	local args = ...
	for _, middleware in pairs(self.middlewares) do
		if not middleware(args) then
			return
		end
	end

	for _, attachedSignal in pairs(self.attachedSignals) do
		attachedSignal:Alert(args)
	end

	for id, element in pairs(self.connections) do
		if typeof(element) == "RBXScriptConnection" then
			continue
		end

		if element.state == dict.connectionState.dead then
			killConnection(self, id)
		elseif element.state == dict.connectionState.alive then
			xpcall(function()
				element.callback(args)
			end, function(err)
				warn(([[
					error signal %s, connection %s \n
					%s
				]]):format(self.name, element.name, err))
			end)
		end
	end

	return 0
end

function module:Destroy()
	self = self :: RolertSignal<any>
	self.alive = false
	self.middlewares.clear()
	self.middlewares.push(function()
		return false
	end)

	for connid, _ in pairs(self.connections) do
		killConnection(self, connid)
	end
	totalSignals[self.id] = nil

	self.attachedSignals:clear()
end

function module:Cleanup()
	for id, _ in pairs(self.connections) do
		killConnection(self, id)
	end
end

function module:Attach(otherAlert: pRolertSignal<nil>, unwarn: boolean?)
	if not unwarn then
		warn(
			"attached signals and self signal must have the same generic type, because all of them will be fired with the same parameters as the main one"
		)
	end

	if not self.alive then
		return warn("cannot attach to dead signal")
	end
	if otherAlert.id == self.id then
		return warn("cannot attach to self")
	end

	for _, otherSignalAttached in otherAlert.attachedSignals do
		if otherSignalAttached.id == self.id then
			return warn("already attached to it ")
		end
	end

	return table.insert(self.attachedSignals, otherAlert)
end

function module:Detach(otherSignal: RolertSignal<any>)
	for ind, otherSignalAttached in self.attachedSignals do
		if otherSignalAttached.id == otherSignal.id then
			return table.remove(self.attachedSignals, ind)
		end
	end
	return
end

function module:CreateBindToRBXSignal(
	rbxSignal: RBXScriptSignal,
	callback: () -> nil,
	name: string?,
	doNotPersist: boolean?
)
	if not self.alive then
		return warn("signal is dispatched")
	end

	local isAsleep = false

	local conn
	if not doNotPersist then
		conn = rbxSignal:Connect(function()
			if isAsleep then
				return
			end
			callback()
			self:Alert()
		end)
	else
		conn = rbxSignal:Once(function()
			callback()
			self:Alert()
		end)
	end

	connectionIdCount = connectionIdCount + 1
	local id = registerConnection(self, conn, name)

	return {
		unbind = function()
			killConnection(self, id)
		end,
		sleep = function()
			isAsleep = false
		end,
		wake = function()
			isAsleep = true
		end,
	}
end
function module:Connect(callback, name: string?)
	if not self.alive then
		return warn("signal is dispatched")
	end

	connectionIdCount = connectionIdCount + 1
	local conn = RolertConnection.new(dict.connectionType.connect, name or "", connectionIdCount, callback)

	registerConnection(self, conn)
	return conn
end

function module:Once(callback, name: string?)
	if not self.alive then
		return warn("signal is dispatched")
	end
	connectionIdCount = connectionIdCount + 1

	local conn
	conn = RolertConnection.new(dict.connectionType.connect, name or "", connectionIdCount, function(...)
		killConnection(self, conn.id)
		callback(...)
	end)

	registerConnection(self, conn)
	return conn
end

return module
