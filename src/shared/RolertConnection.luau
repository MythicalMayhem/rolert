local dict = require(script.Parent.dict)

local RolertConnection = {}
RolertConnection.__index = RolertConnection

function RolertConnection.new<T>(connectionType: ConnectionType, Name: string, id: number, callback)
	local conn = {
		name = Name or "",
		state = dict.connectionState.alive,
		connectionType = connectionType,
		callback = callback,
		id = id,
	}

	return setmetatable(conn, RolertConnection)
end

function RolertConnection:Wake()
	if self.state == dict.connectionState.dead then
		return
	end
	self.state = dict.connectionState.alive
end

function RolertConnection:Sleep()
	if self.state == dict.connectionState.dead then
		return
	end
	self.state = dict.connectionState.asleep
end

function RolertConnection:Destroy()
	self.state = dict.connectionState.dead
end




return RolertConnection
