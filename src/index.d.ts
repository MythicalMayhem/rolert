export enum ConnectionState {
	Asleep = 1,
	Awake,
	Dead,
}

export enum ConnectionType {
	Connect = 1,
	Once,
	Expire,
}


interface RolertConnection {
	wake: () => undefined
	sleep: () => undefined
	destroy: () => undefined
	state: ConnectionState
}

interface RolertSignal<args extends unknown[]> {
	alert(...args: args): void

	attach(otherAlert: RolertSignal<args>): void
	
	detach(otherAlert: RolertSignal<args>): void

	connect(cb: (...params: args) => void, name?: string): RolertConnection
	once(cb: (...params: args) => void, name?: string): RolertConnection
	expire(
		duration: number,
		onSuccess: (params: args) => void,
		onExpire?: () => void,
		name?: string
	): RolertConnection
	createBindToRBXSignal<T extends (...params: any[]) => any>(
		connectionType: "CONNECT" | "ONCE",
		rbxSignal: RBXScriptSignal<T>,
		argumentArray: args
	): RBXScriptConnection

	cleanup(): void
	destroy(): void
}
