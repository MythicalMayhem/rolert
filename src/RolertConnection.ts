import { ConnectionState, ConnectionType } from "./dict"

export type params<T> = Parameters<
	T extends unknown[]
		? (...args: T) => void
		: T extends unknown
		? (arg: T) => void
		: () => void
>

export type callback<T> = (...args: params<T>) => Promise<void> | void

class RolertConnection<T extends (unknown | unknown[]) = unknown> {
	private static name: number = 0
	state: ConnectionState = ConnectionState.Awake

	constructor(
		public connectionType: ConnectionType,
		public readonly name: string = "unnamed connection " +
			RolertConnection.name++,
		readonly id: number,
		readonly callback: callback<T>
	) {}

	reconnect() {
		if (this.state === ConnectionState.Dead) return
		this.state = ConnectionState.Awake
	}

	sleep() {
		if (this.state === ConnectionState.Dead) return
		this.state = ConnectionState.Asleep
	}

	destroy() {
		this.state = ConnectionState.Dead
	}
}

export default RolertConnection
