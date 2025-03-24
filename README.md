### BCSwaper
#### 简介
BCSwaper是一个程序化交易开发框架，通过对接DYDX/OKX等交易所，为数字货币合约、现货等品种的交易策略开发提供支持。  
在BCSwaper的加持下，您将大大节省程序化交易开发的工作量，同时实现同一策略在不同交易所下的自由切换。

在使用BCSwaper之前，您需要具备如下技能：  
1、基本的软件安装、配置能力，如有linux等系统的操作经验更佳。  
2、Javascript/Typescript开发能力，能基于框架提供的方法模型实现策略。

通过本文档的阅读，您将可以在BCSwaper之上较为方便地编写策略程序。  
让我们开始吧。

### 安装配置

#### 环境要求
Linux等常见操作系统，容器化运行环境如docker/podman等。  
下文以将CentOS Stream 9及Podman 5.x环境为例介绍安装过程。

#### 安装
以下操作在root用户下完成。

若操作者为其他用户，可能会在容器创建、运行的过程中遇到一些权限问题，请自行解决。  
```shell
podman build -t dus0571/bcswaper .
podman run -name bcswaper -p 9527:9727 -d dus0571/bcswaper
```
系统默认开放9527端口，使用http协议，可通过http://<*ip*>:9527/进行访问。若系统部署在开放式环境，请自行控制对该端口的访问策略以确保安全。在本地环境下，可直接访问`http://localhost:9527/`进入系统界面。

#### 配置
打开用户界面后，首先需要配置账户信息。

点击右上角<*账户*>按钮进入账户管理页面，点击页面左上<+*Account*>按钮新建账户信息。  
对于DYDX账户，依次输入如下信息：账户名/账户地址/PrivateKey/Mnemonic/交易所，其中账户名自定义，账户地址为DYDX链地址，PrivateKey为非必填项，Mnemonic为助记词。  
对于OKX账户，则也有相应的配置字段，不再赘述。
确认无误后，点击保存即可。  
点击右上角<*设置*>按钮进入设置管理页面，可以设置语言等信息。

### 策略编写
系统可同时支持多个策略的交易。

点击左侧菜单<*策略*>进入策略管理页面，点击页面上方按钮<+*Strategy*>新建策略：  
![策略编写界面](https://github.com/wolf571/bcswaper/blob/main/pic1.png)

弹出层左侧为代码编辑区，可在此处输入策略代码，需用typescript编写。  
右侧为该策略相关字段，其中交易标的为合约代码，表示建议的交易标的代码；策略参数可定义多个字段，这些字段可在代码中通过Params类型的成员获取。

在本例中，策略参数的定义为current!: number;。如果要设置多个参数，按照格式依次输入即可，如：
```typescript
param1!: string;
param2!: boolean;
```
完成策略编辑后，点击<*SAVE*>按钮保存即可。

#### 策略示例
以下是一段代码示例，展示了根据价格变化进行下单的过程，仅供参考。
```typescript
// start to edit typescript code for the strategy.
class Strategy1 extends SwapUser {

    // 交易参数
    params!: Params;

    // 初始化
    init = (): void => {
        // 订阅行情价格
        this.subscribeTick();
    };

    // 价格变化事件处理
    handleTick = (price: number): void => {
        if (this.params.current === 0) {
            this.params.current = price;
            this.log("init params: ", this.params);
            return;
        }
        // 价格高于当前价格1%时，卖出一笔
        if (price >= this.params.current * 1.01) {
            const order: Order = <Order>{
                type: OrderType.LIMIT,
                side: OrderSide.SELL,
                price,
                size: 0.001,
            }
            this.params.current = price;
            this.bcswap.sell(price, order.size);
            return;
        }
        // 价格低于当前价格1%时，买入一笔
        if (price <= this.params.current * 0.99) {
            const order: Order = <Order>{
                side: OrderSide.BUY,
                type: OrderType.LIMIT,
                price,
                size: 0.001,
            };
            this.params.current = price;
            this.bcswap.buy(price, order.size);
        }
    };

    // 订单状态变化
    orderCallback = (order: Order): void => {
        this.log("order callback: ", order);
    };

    // 订单成交状态变化
    fillCallback = (fill: Fill): void => {
        this.log("fill callback: ", fill);
    };
}
```
#### 方法介绍
若要编写相对完善的策略，还需要涉及更多的内容。本节介绍BCSwaper框架提供的主要能力，同时也会给出一些示例。

#### SwapUser类
类SwapUser封装了一系列字段和方法，提供了多种机制以方便策略的编写。我们所有的自定义策略类均需继承SwapUser类并根据需要重写必要的初始化、回调方法等。  
在编写策略类时，不需要构造函数constructor。

#### symbol字段
字段symbol表示该策略的交易标的，如ETH-USD。该字段值在交易启动时会自动注入到策略实例中，通常情况下我们不需要关注它的存在。

#### bcswap字段
字段bcswap为Engine类型的成员，封装了交易所客户端SDK或API，主要用于与交易所或链的交互。在BCSwaper框架下，bcswap主要封装了订阅账户、行情信息，发起交易等功能。这里我们只需要了解其中的少数几个方法即可。
<table>
	<tr>
		<th>方法</th>
		<th>参数</th>
		<th>说明</th>
	</tr>
	<tr>
		<td>
getPrice</td>
		<td>-</td>
		<td>获取交易标的当前价格</td>
	</tr>
	<tr>
		<td>getOrderbook</td>
		<td>-</td>
		<td>获取订单簿</td>
	</tr>
	<tr>
		<td>getCandles</td>
		<td>resolution:CandleResolution</td>
		<td>获取蜡烛列表
其中CandleResolution为枚举类型，表示蜡烛图的周期</td>
	</tr>
	<tr>
		<td>getAccountInfo</td>
		<td>-</td>
		<td>获取账户信息
返回AccountInfo类型的字段</td>
	</tr>
	<tr>
		<td>buy</td>
		<td>price: number 
size: number</td>
		<td>市价买
price表示价格，size表示数量
在市价下单时，某些交易所price必填，所以这个参数最好填一个合适的价格。
比如dydx，系统参数可设置抓溢价，这里只需要传入当前价格即可。</td>
	</tr>
	<tr>
		<td>sell</td>
		<td>price: number 
size: number</td>
		<td>市价卖
参数同上
注意：市价单为短期单，并不保证一定成交</td>
	</tr>
	<tr>
		<td>buyLimit</td>
		<td>price: number 
size: number</td>
		<td>限价买
参数同上</td>
	</tr>
	<tr>
		<td>sellLimit</td>
		<td>price: number 
size: number</td>
		<td>限价卖
参数同上</td>
	</tr>
	<tr>
		<td>close</td>
		<td>
side: OrderSide
price: number
size: number</td>
		<td>市价平仓
side表示交易方向，price表示价格，size表示数量</td>
	</tr>
	<tr>
		<td>closeLimit</td>
		<td>
side: OrderSide
price: number
size: number</td>
		<td>限价平仓
并不是所有交易所都支持，谨慎使用。
注意：close及closeLimit方法并不是必要的。根据交易实践，在dYdX中，提交一个方向相反的订单即可达到平仓的效果.
</td>
	</tr>
	<tr>
		<td>cancel</td>
		<td>
order: Order</td>
		<td>
撤单
输入原订单即可</td>
	</tr>
</table>

#### params字段
前文已有提及，为Params类型的字段，可以通过该字段获取自定义参数。  
我们在编写策略代码时，可直接声明一个Params类型的成员并进行使用：  
params!: Params;

#### init方法
初始化方法，在策略运行之前做一些准备工作，如订阅行情等。以下代码：
```typescript  
    init = (): void => {
        this.subscribeTick();
        this.subscribeCandle(CandleResolution.DAY1);
    }; 
``` 
分别订阅了价格和日K线数据。

#### getOrders方法
系统会在内存中维护一个订单列表，缓存最近的订单信息，我们可以通过getOrders方法获取该列表。  
类似的方法还有：
```typescript
// 根据订单方向获取订单列表
getOrdersBySide (side: OrderSide): Order[];
// 根据订单方向获取盈利单列表
getProfitOpenedOrders (side: OrderSide, price: number): Order[];
// 从order map中根据价格获取一个被取消的订单
// 当为卖单时，过滤条件price>order.price；为买单时，过滤条件price<order.price
getCancledOpeningOrderWithPrice (side: OrderSide, price: number): Order | null;
// 从order map中获取一个被取消的订单
getCancledOrder (side: OrderSide): Order | null;
// 从order map中获取一个被取消的平仓订单
getCancledClosingOrder (side: OrderSide): Order | null;
// 根据订单id从map中删除某个订单
removeOrder(id: string):void;
```
#### clean方法
以某个价格市价清仓某个方向的持仓。如：  
`this.clean(PositionSide.SHORT, price);`
表示以价格price清仓空头仓位。

#### clearLapseOrders方法
清理某个方向的未成交订单，包括OPEN/CANCELED等状态。如：  
`this.clearLapseOrders(OrderSide.BUY);`
若订单为OPEN状态， 会先进行撤单操作。

#### handleTick方法
价格变化回调处理方法。如：  
```typescript
handleTick = async(price: number) => {
    this.conlog2("price: ", price);
};
```
需要订阅价格，即在init中调用subscribeTick方法。

#### handleCandle方法
K线变化回调处理方法。如：  
```typescript
handleCandle = async(candle: Candle, resolution: CandleResolution) => {
    this.conlog2("candle: ", candle);
};
```
需要订阅K线，即在init方法中调用subscribeCandle方法。

#### accountCallback方法
账户变化回调处理方法。如：  
```typescript
accountCallback = async(accountInfo: AccountInfo) => {
    this.conlog2("account: ", accountInfo);
};
```
当账户状态有变化时，会回调该函数。  
另外，在其他方法中可通过this.bcswap.getAccountInfo()获取账户信息，并根据需要进行相应的操作。

#### positionCallback方法
持仓变化回调处理方法。如：
```typescript
positionCallback = async(positions: PositionData[]) => {
    this.conlog2("positions: ", positions);
};
```
与accountCallback类似，只是针对性地对持仓的变动作出响应。

#### orderCallback方法
订单状态变化回调处理方法。如： 
```typescript 
orderCallback = async(order: Order) => {
    this.conlog2("order callback: ", order);
};
```
参数为Order类型，为当前回报订单的封装。

#### fillCallback方法
订单成交变化回调处理方法。如： 
```typescript 
fillCallback = async(fill: Fill) => {
    this.conlog2("fill callback: ", fill);
};
```
当订单有成交时，回调该方法。

#### validPosition方法
判断某个方向上是否有足够仓位，常用来在平仓前进行操作。如  
`const valid = this.validPosition(PositionSide.LONG, 1);`
表示判断是否有至少1个多头仓位。

#### log方法
写日志，同时附加上当前时间。  
conlog2方法会将日志写入标准输出。  
log方法会把日志写到数据库和标准输出。

#### calculateSize方法
提供的一个小功能，根据账户资产价值计算单次下单的size，即一笔开单的标的数量。  
两个参数price、n分别表示价格和份数，如果参数校验失败则返回0。
如品种price=3000，n=100，则有  
`const size = this.calculateSize(3000, 100);`

#### addNumber和subNumber方法
两数相加、相减。由于策略代码为动态编译和运行， ts对于number类型的字段计算可能会出现莫名其妙的问题，建议用此两个方法进行加减计算。如：  
`this.addNumber(num1, num2)`，表示num1 + num2，
`this.subNumber(num1, num2)`，表示num1 - num2。
#### timer方法
定时器方法，封装了schedule.scheduleJob，可定时执行一些操作。
如在设置每隔10分钟执行一次回报检查：  
```typescript
init = (): void => {
    // 每10分钟检查一次行情回报
    this.timer(`8 */10 * * * *`, () => {
        // 输出check信息
        this.conlog2(`check market ...`, );
    });
    //other method ...
};
```
其中，方法的第一个参数支持string | Date | number类型，具体格式可参考scheduleJob的定义；第二个参数为要执行的函数体。  
系统有几个默认定时任务，请知悉：  
1、每隔一段时间，检查撤单、下单情况，判断是否需要重试，和系统参数orderInterval有关。  
2、每隔10分钟，检查一次行情回报，若超时无回报，系统将进行重连。  
3、每天8时，系统将清理一次过期订单，包括缓存订单列表和数据库中的订单记录，此行为和系统参数orderCacheDays有关。其中，缓存订单在超过1024条时才会触发清理操作。  
4、每天16时，清理过期日志。

#### 策略运行

#### 运行
策略的运行在<*交易*>菜单中管理。  
点击页面上方按钮<+*Trade*>新建交易：  
![交易运行界面](https://github.com/wolf571/bcswaper/blob/main/pic2.png)

如上图，输入交易名称，选择策略和交易账户，子账户默认为0即可，填写交易标的。  
参数定义相关字段，需要按照json格式输入，和所选策略的参数定义对应。  
确保字段无误，保存后点击<*运行*>按钮，即可运行该策略。

#### 容错机制
根据实践经验，系统对于下单、撤单等过程建立了一些容错机制。比如：  
1、下单无反馈/错误时，系统允许在一定时间内再次自动执行下单指令，相关的配置参数为ensureSeconds。  
2、撤单时也有类似的机制，默认3s检查一次。  
3、下单回报常有先后顺序混乱的情况，系统会判断回报的订单状态，将其与缓存的orderMap中的订单状态对比，如果认为存在先后颠倒问题，则会做一些纠正。

#### 系统参数
<table>
	<tr>
		<th>参数</th>
		<th>类型</th>
		<th>推荐值</th>
		<th>说明</th>
	</tr>
	<tr>
		<td>orderInterval</td>
		<td>number</td>
		<td>3</td>
		<td>下单间隔，单位秒
对于中心化交易所，可设置为1
</td>
	</tr>
	<tr>
		<td>effortTimes</td>
		<td>
	number	</td>
		<td>-1</td>
		<td>下单重试次数</td>
	</tr>
	<tr>
		<td>
effortInterval	</td>
		<td>
	number	</td>
		<td>20</td>
		<td>下单重试间隔，单位秒</td>
	</tr>
	<tr>
		<td>
cancelingTimes	</td>
		<td>
	number	</td>
		<td>2</td>
		<td>撤单重试次数
		<tr>
				<td>
cancelingInterval</td>
				<td>
	number</td>
				<td>	10	</td>
				<td>撤单重试间隔，单位秒			</td>
			</tr>
			<tr>
				<td>
bestEffortSeconds			</td>
				<td>
	number			</td>
				<td>3</td>
				<td>报单取消状态冷却时间，单位秒</td>
			</tr>
			<tr>
				<td>
marketSpreads			</td>
				<td>
	number			</td>
				<td>0.0001</td>
				<td>扫单溢/折价率td>
			</tr>
			<tr>
				<td>
orderCacheDays</td>
				<td>
	number			</td>
				<td>30</td>
				<td>订单缓存时间，单位天</td>
			</tr>
<tr><td>
logKeepDays</td>
				<td>
	number	</td>
		<td>10</td>
		<td>日志保留时间，单位天</td>
	</tr>
</table>


### 日志跟踪
有两种方式可以查看日志：  
1、查看容器日志；  
2、查看系统<*日志*>模块。  
容器日志输出了更多的信息，包括但不限于各种提示信息、异常信息等。  
系统<*日志*>模块仅保存了通过this.log方法记录的内容，提供了较为方便地查看策略输出的一种选择。  
通过分析日志，我们可以对策略的执行情况有一个基本的了解。

### 关于
#### 免责条款
1、BCSwaper的正常运行需要配置一些隐私信息，这些数据仅用于交易程序运行。  
2、BCSwaper不保证您的账户、交易及数据安全，也不对您的交易策略结果负责。  
3、请确保运行BCSwaper的网络环境、操作系统处于安全状态，不要泄露任何敏感数据。

#### 联系方式
如有疑问，可联系flare.doo@gmail.com，或+qq:251480809。
