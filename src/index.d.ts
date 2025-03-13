type callback<T extends any, R> = (args: T) => R

export type ConnectionType = "connect" | "once" | "expire" | "wait" | "nul"
export type ConnectionState = "asleep" | "alive" | "dead"

interface RolertConnection {
	state: ConnectionState

	Wake: (self: RolertConnection) => void
	Sleep: (self: RolertConnection) => void
	Destroy: (self: RolertConnection) => void

	Disconnect: (self: RolertConnection) => void
}

interface RolertConstructor {
	new <T extends unknown[]>(name?: string): RolertSignal<T>
	totalConnections: Record<number, RolertConnection | RBXScriptConnection>
	totalSignals: Record<number, RolertSignal>
}

interface RolertSignal<T extends unknown[] | unknown = unknown> {
	name: string
	middlewares: ((args: T) => boolean)[]
	Connect: callback<T, RolertConnection>
	Once: callback<T, RolertConnection>

	CreateBindToRBXSignal: (
		rbxSignal: RBXScriptSignal,
		callback: () => void,
		name?: string,
		doNotPersist?: boolean
	) => {
		unbind: () => void
		sleep: () => void
		wake: () => void
	}

	Wait: (
		duration: number,
		yield: boolean,
		onSuccess: (args: T) => void,
		onExpire?: () => void,
		name?: string
	) => RolertConnection

	Attach: (otherAlert: RolertSignal<T>) => void
	Detach: (otherSignal: RolertSignal<T>) => void
	Alert: (args: T) => number

	Cleanup: () => number

	Destroy: callback<T, number>
}

declare const RolertSignal: RolertConstructor
export default RolertSignal
