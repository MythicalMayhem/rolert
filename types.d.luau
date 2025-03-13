export type ConnectionType = "connect" | "once" | "expire" | "wait" | "nul"
export type ConnectionState = "asleep" | "alive" | "dead"

export type callback<T...> = (T...) -> nil

export type pRolertConnection = {
	id: number,
	callback: callback<any>,
} & RolertConnection

export type pRolertSignal<T...> = {
	id: number,
	name: string,
	new: (name: string) -> pRolertSignal<T...>,
	attachedSignals: { pRolertSignal<T...> },
	connections: { [number]: pRolertConnection | RBXScriptConnection },
	alive: boolean,
} & RolertSignal<T...>

export type RolertSignal<T...> = {
	name: string,
	middlewares: { (T...) -> boolean },

	Connect: (self:RolertSignal<T...>, callback<T...>) -> RolertConnection,
	Once: (self:RolertSignal<T...>, callback<T...>) -> RolertConnection,
	CreateBindToRBXSignal: <K...>(
		self:RolertSignal<T...>,
		rbxSignal: RBXScriptSignal,
		callback: () -> nil,
		name: string?,
		doNotPersist: boolean?
	) -> {
		unbind: () -> nil,
		sleep: () -> nil,
		wake: () -> nil,
	},

	Alert: (self:RolertSignal<T...>, T...) -> number,
	Destroy: (self:RolertSignal<T...>, callback<T...>) -> number,
	Cleanup: (self:RolertSignal<T...>) -> number,
}

export type RolertConnection = {
	state: ConnectionState,
	Wake: (self: RolertConnection) -> nil,
	Sleep: (self: RolertConnection) -> nil,
	Destroy: (self: RolertConnection) -> nil,

	Disconnect: (self: RolertConnection) -> nil,
}
