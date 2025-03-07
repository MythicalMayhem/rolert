import RolertConnection from "./RolertConnection"

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

//todo: add memory debug features

class RolertSignal<args extends unknown[]> {
	private static connectionIdCount = 0
	private static signalIdCount = 0

	private static readonly gameConnections = new Map<
		number,
		RolertConnection | RBXScriptConnection
	>()
	private static readonly gameSignals = new Map<number, RolertSignal<any>>()

	public readonly id: number = RolertSignal.signalIdCount++

	attachedSignals: RolertSignal<args>[] = []
	readonly connections = new Map<
		number,
		RolertConnection<args> | RBXScriptConnection
	>()
	readonly middlewares: ((args: args) => boolean)[] = []

	constructor() {
		RolertSignal.gameSignals.set(this.id, this)
	}

	alert(...args: args) {
		xpcall(
			() => {
				for (const middleware of this.middlewares)
					if (!middleware(args)) return

				for (const attachedSignal of this.attachedSignals)
					attachedSignal.alert(...args)

				for (const [id, element] of this.connections) {
					if (typeIs(element, "RBXScriptConnection")) continue
					if (element.state === ConnectionState.Dead)
						this.killConnection(id)
					else if (element.state === ConnectionState.Awake)
						element.callback(args)
				}
			},
			(err) => warn(err)
		)
	}

	destroy() {
		for (const [connid] of this.connections) this.killConnection(connid)
	}

	private killConnection(id: number) {
		const conn = RolertSignal.gameConnections.get(id)
		if (typeIs(conn, "RBXScriptConnection")) conn.Disconnect()
		else conn?.destroy()
		RolertSignal.gameConnections.delete(id)
		this.connections.delete(id)
	}

	private registerConnection(conn: RolertConnection<args>) {
		RolertSignal.gameConnections.set(conn.id, conn as RolertConnection)
		this.connections.set(conn.id, conn as RolertConnection)
	}

	/**
	 * when this one fires, otherSignal will fire too
	 */
	attach(otherAlert: RolertSignal<args>) {
		if (otherAlert.id === this.id) return warn("cannot attach to self")
		for (const otherSignalAttached of otherAlert.attachedSignals) {
			if (otherSignalAttached.id === this.id)
				return warn("already attached to it ")
		}

		this.attachedSignals.push(otherAlert)
	}

	detach(otherAlert: RolertSignal<any>) {
		this.attachedSignals = this.attachedSignals.filter(
			(alert) => alert.id === otherAlert.id
		)
	}

	createBindToRBXSignal<T extends Callback>(
		rbxSignal: RBXScriptSignal<T>,
		argumentArray: args,
		persist: boolean = false
	): RBXScriptConnection {
		const conn = persist
			? rbxSignal.Connect((() => {
					this.alert(...argumentArray)
			  }) as T)
			: rbxSignal.Once((() => {
					this.alert(...argumentArray)
			  }) as T)

		return conn
	}

	connect(cb: (...params: args) => void, name?: string) {
		const id = RolertSignal.connectionIdCount++
		const conn = new RolertConnection(
			ConnectionType.Connect,
			name,
			id,
			async (params: args) => cb(...params)
		)
		this.registerConnection(conn)
		return conn
	}

	once(cb: (...params: args) => void, name?: string) {
		const id = RolertSignal.connectionIdCount++
		let conn: RolertConnection<args>
		conn = new RolertConnection(
			ConnectionType.Once,
			name,
			id,
			async (params: args) => {
				this.killConnection(id)
				cb(...params)
			}
		)
		this.registerConnection(conn)
		return conn
	}

	/**
	 * awaits an alert() from the signal,
	 * @param onSuccess callback function on Rolert alert
	 * @param onExpire optional, will be called when duration elapsed with no signal alert
	 * @param duration await duration
	 *
	 * @description
	 *
	 * if onExpire is defined then creates a new thread to task.wait(duration),
	 * other wise will be cleaned up on the next alert,
	 */
	expire(
		duration: number,
		onSuccess: (params: args) => void,
		onExpire?: () => void,
		name?: string
	) {
		const id = RolertSignal.connectionIdCount++
		let conn: RolertConnection<args>
		let T = tick()
		conn = new RolertConnection(
			ConnectionType.Once,
			name,
			id,
			async (params: args) => {
				T = -1
				this.killConnection(id)
				if (tick() - T < duration) onSuccess(params)
			}
		)
		if (onExpire)
			task.spawn(() => {
				task.wait(duration)
				if (T > 0) onExpire()
			})
		this.registerConnection(conn)
		return conn
	}

	cleanup() {
		for (const [, element] of this.connections) {
			if (typeIs(element, "RBXScriptConnection")) element.Disconnect()
			else element.destroy()
		}
	}
}

export default RolertSignal