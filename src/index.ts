import RolertConnection, { callback, params } from "./RolertConnection"

import { ConnectionState, ConnectionType } from "./dict"


//todo: add memory debug features

class RolertSignal<args extends (unknown[] | unknown) = void> {
	private static connectionIdCount = 0
	private static signalIdCount = 0

	private static readonly gameConnections = new Map<number,RolertConnection | RBXScriptConnection>()
	private static readonly gameSignals = new Map<number, RolertSignal<any>>()

	public readonly id: number = RolertSignal.signalIdCount++

	readonly middlewares: ((...args: params<args>) => boolean)[] = []
	attachedSignals: RolertSignal<args>[] = []

	readonly connections = new Map<number, RolertConnection | RBXScriptConnection>()

	private alive = true

	constructor(public readonly name:string = "signal #" + this.id) {
		RolertSignal.gameSignals.set(this.id, this)
	}

	/**
	 * executes the callback of all connections
	*/
	Alert(...args: params<args>) {
		if(!this.alive) return warn('cannot fire dispatched signal')
		xpcall(
			() => {
				for (const middleware of this.middlewares)
					if (!middleware(...args)) return

				for (const attachedSignal of this.attachedSignals)
					attachedSignal.Alert(...args)

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

	/**
	 * diconnects all connections,
	 * detaches all attached signals,
	 * and renders this signal, functionless
	 */
	destroy() {
		this.alive = false
		for (const [connid] of this.connections) 
			this.killConnection(connid)
		RolertSignal.gameSignals.delete(this.id)
		this.attachedSignals.clear() 
		this.middlewares.clear() 
		this.middlewares.push(()=> false)
	}

	private killConnection(id: number) {
		const conn = RolertSignal.gameConnections.get(id)
		if (typeIs(conn, "RBXScriptConnection")) conn.Disconnect()
		else conn?.destroy()
		RolertSignal.gameConnections.delete(id)
		this.connections.delete(id)
	}

	private registerConnection(
		conn: RolertConnection | RBXScriptConnection
	) {
		if (typeIs(conn,"RBXScriptConnection"))
			this.connections.set(RolertSignal.connectionIdCount++, conn)
		else{
			RolertSignal.gameConnections.set(conn.id, conn as RolertConnection)
			this.connections.set(conn.id, conn )
		}
		return typeIs(conn,"RBXScriptConnection")? RolertSignal.connectionIdCount: conn.id
	}

	/**
	 * when this one fires, otherSignal will fire too
	 */
	attach(otherAlert: RolertSignal<args>) {
		if (!this.alive) return warn('cannot attach to dead signal')
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

	/**
	 * @param rbxSignal when this fires, the signal will fire too
	 * @param persist if true the signal will fire as many times as @rbxSignal does
	 * @param argumentArray an array of parameters, you can update the parameters
	 * @returns a disconnection method
	 */
	createBindToRBXSignal<T extends Callback>(
		rbxSignal: RBXScriptSignal<T>,
		persist: boolean,
		argumentArray: params<args>,
		name?:string
	) {
		if (!this.alive) return warn('signal is dispatched')
		let isAsleep = false
		const conn = persist
			? rbxSignal.Connect((() => {
					if (isAsleep) return
					this.Alert(...argumentArray)
			  }) as T)
			: rbxSignal.Once((() => {
					this.Alert(...argumentArray)
			  }) as T)
		
		const id = this.registerConnection(conn)

		return {
			disconnect: () => this.killConnection(id),
			sleep:()=> isAsleep = false,
			reconnect:()=> isAsleep = true
		}
	}

	/**
	 * yields threa until next signal event
	 * @yields
	 */
	wait(callback: callback<args>, name?:string) {
		const co = coroutine.running()
		const conn = this.once((...params: params<args>) => {
			coroutine.status(co)==="suspended" && task.spawn(co) && callback(...params)
		}, name)
		coroutine.yield()
		return {
			disconnect:()=>{
				conn?.destroy()
				task.spawn(co)		
			}
		}
	}

	/**
	 * 
	 * @param callback runs when signal is fired
	 * @param name optional for debugging
	 * @returns 
	 */
	connect(callback: callback<args>, name?: string) {
		if (!this.alive) return warn('signal is dispatched')
		const id = RolertSignal.connectionIdCount++
		const conn = new RolertConnection(
			ConnectionType.Connect,
			name,
			id,
			(...args:params<args>)=>callback(...args)
		)
		this.registerConnection(conn)
		return conn
	}

	/**
	 * will only run once and automatically
	 * @param callback runs on the next signal fire
	 * @param name optional for debugging
	 */
	once(callback: callback<args>, name?: string) {
		if (!this.alive) return warn('signal is dispatched')
		const id = RolertSignal.connectionIdCount++
		const conn = new RolertConnection(
			ConnectionType.Once,
			name,
			id,
			(...params:params<args>) => {
				this.killConnection(id)
				callback(...params)
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
	 * does not yield.
	 * if onExpire is defined then creates a new thread to task.wait(duration),
	 * other wise will be cleaned up on the next alert,
	 */
	expire(
		duration: number,
		onSuccess: callback<args>,
		onExpire?: () => void,
		_yield: boolean = false,
		name?: string
	) {
		if (!this.alive) return warn('signal is dispatched')
		const id = RolertSignal.connectionIdCount++
		let T = tick()
		const conn = new RolertConnection(
			ConnectionType.Once,
			name,
			id,
			(...params: params<args>) => {
				T = -1
				this.killConnection(id)
				if (tick() - T < duration) onSuccess(...params)
			}
		)

		if (onExpire)
			if (_yield){
				task.wait(duration)
				if (T > 0) onExpire()
			}else 
				task.spawn(() => {
					task.wait(duration)
					if (T > 0) onExpire()
					})
		this.registerConnection(conn)
		return conn
	}
	
	/**
	 * disconnects all active connections
	 */
	cleanup() {
		for (const [id] of this.connections) this.killConnection(id)
	}
}

export default RolertSignal
