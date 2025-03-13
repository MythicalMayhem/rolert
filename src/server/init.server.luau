local ReplicatedStorage = game:GetService("ReplicatedStorage")

local rolert = require(ReplicatedStorage.Shared.RolertSignal)

local RunService = game:GetService("RunService")

local signal: RolertSignal<string> = rolert.new()

signal:Connect(function(s)
	print(s .. " connect")
end)

signal:Once(function(s)
	print(s .. " once")
end)


signal:Alert("hello")
signal:Alert("hello")
signal:Alert("hello")
signal:Alert("hello")

-- local conn = signal:CreateBindToRBXSignal(RunService.Stepped, function() end)

--[[
--bind to signal

task.wait(2)

conn:unbind()
]]

--[[
--connect

local signal: RolertSignal<string> = rolert.new("dd")

local conn0 = signal:Connect(function(s)
	print("my silly string" .. s)
end)

local conn1 = signal:Connect(function(s)
	print("my silly string" .. s)
end)

while true do
	signal:Alert("HEYYY ")
	task.wait()
end

task.wait(5)

conn0:Disconnect()
conn1:Disconnect()
]]
