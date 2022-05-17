import React, { useState, useEffect } from "react";
import {
  Dimensions,
  FlatList,
  LogBox,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const URL = "wss://api-pub.bitfinex.com/ws/2/";

const formatNum = (num) => Math.round(num * 100) / 100;

const lerp = (x, y, a) => x * (1 - a) + y * a;
const clamp = (a, min = 0, max = 1) => Math.min(max, Math.max(min, a));
const invlerp = (x, y, a) => clamp((a - x) / (y - x));
const range = (x1, y1, x2, y2, a) => {
  const res = lerp(x2, y2, invlerp(x1, y1, a));
  if (isNaN(res)) return 0;
  else return res;
};

const precInput = (prec) => {
  switch (prec) {
    case 0:
      return "P0";
    case 1:
      return "P1";
    case 2:
      return "P2";
    case 3:
      return "P3";
    case 4:
      return "P4";
    default:
      return "P0";
  }
};

const width = Dimensions.get("window").width;

LogBox.ignoreLogs(["VirtualizedLists should never be nested"]);

const App = () => {
  const [connect, setConnect] = useState(true);
  const [bids, setBids] = useState([]);
  const [asks, setAsks] = useState([]);
  const [bidsObj, setBidsObj] = useState({});
  const [asksObj, setAsksObj] = useState({});
  const [maxAsk, setMaxAsk] = useState(0);
  const [maxBid, setMaxBid] = useState(0);
  const [prec, setPrec] = useState(0);

  useEffect(() => {
    if (!connect) return;
    const ws = new WebSocket(URL);
    try {
      ws.onopen = () => {
        console.log("open");
        ws.send(
          JSON.stringify({
            event: "subscribe",
            channel: "book",
            symbol: "tBTCUSD",
            freq: "F1",
            prec: precInput(prec),
          })
        );
      };

      ws.onmessage = (e) => {
        try {
          const message = JSON.parse(e.data);
          const [price, count, amount] = message[1];
          if (!price || !amount) return;
          const formattedPrice = formatNum(price);
          const formattedAmount = amount.toFixed(2);
          if (isNaN(formattedPrice) || isNaN(formattedAmount)) return;
          if (count === 0) {
            if (bidsObj[price]) {
              setBidsObj((prevState) => {
                const newState = { ...prevState };
                delete newState[price];
                return newState;
              });
            }
            if (asksObj[amount]) {
              setAsksObj((prevState) => {
                const newState = { ...prevState };
                delete newState[price];
                return newState;
              });
            }
          }
          if (count > 0) {
            if (amount > 0) {
              setBidsObj((prevState) => ({
                ...prevState,
                [formattedPrice]: formattedAmount,
              }));
            } else {
              setAsksObj((prevState) => ({
                ...prevState,
                [formattedPrice]: Math.abs(formattedAmount),
              }));
            }
          } else {
          }
        } catch (error) {
          console.log(error);
        }
      };
    } catch (error) {
      console.log(error);
    }
    return () => {
      ws.close();
      setBidsObj({});
      setAsksObj({});
      setMaxAsk(0);
      setMaxBid(0);
    };
  }, [connect, prec]);

  useEffect(() => {
    const val = Object.entries(asksObj) || [];
    let total = 0;
    const asksWithTotal = val.map((elem) => {
      total = (Number(elem[1]) + Number(total)).toFixed(2);
      return [...elem, total];
    });
    if (asksWithTotal.length)
      setMaxAsk(asksWithTotal[asksWithTotal.length - 1][2] || 0);
    setAsks(asksWithTotal);
  }, [asksObj]);

  useEffect(() => {
    const val = Object.entries(bidsObj) || [];
    let total = 0;
    const bidsWithTotal = val.reverse().map((elem) => {
      total = (Number(elem[1]) + Number(total)).toFixed(2);
      return [...elem, total];
    });
    if (bidsWithTotal.length)
      setMaxBid(bidsWithTotal[bidsWithTotal.length - 1][2] || 0);
    setBids(bidsWithTotal);
  }, [bidsObj]);

  const renderItem = ({ item }) => (
    <View style={{ position: "relative", minHeight: 30 }}>
      <View
        style={[
          styles.asksProgressBar,
          { width: range(1, maxAsk, 5, width / 2, item[2]) },
        ]}
      />
      <View style={[styles.row, styles.orderContainer]}>
        <Text style={styles.order}>{item[0]}</Text>
        <Text style={styles.order}>{item[2]}</Text>
      </View>
    </View>
  );

  const renderItemInverse = ({ item }) => (
    <View style={{ position: "relative", minHeight: 30 }}>
      <View style={styles.bidsProgressBarContainer}>
        <View
          style={[
            styles.bidsProgressBar,
            { width: range(1, maxBid, 5, width / 2, item[2]) },
          ]}
        />
      </View>
      <View style={[styles.row, styles.orderContainer]}>
        <Text style={styles.order}>{item[2]}</Text>
        <Text style={styles.order}>{item[0]}</Text>
      </View>
    </View>
  );

  const handleDisconnect = () => {
    console.log("handleDisconnect");
    setConnect(false);
  };

  const handleConnect = () => {
    console.log("handleConnect");
    setConnect(true);
  };

  const addPrec = () => {
    if (prec > 3) return;
    setPrec(prec + 1);
  };

  const removePrec = () => {
    if (prec === 0) return;
    setPrec(prec - 1);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>ORDER BOOK</Text>
        <View style={styles.row}>
          <TouchableOpacity style={styles.btn} onPress={addPrec}>
            <Text style={styles.title}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={removePrec}>
            <Text style={styles.title}>-</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.titleContainer}>
        <View style={styles.row}>
          <TouchableOpacity style={styles.btn} onPress={handleConnect}>
            <Text style={styles.title}>Connect</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={handleDisconnect}>
            <Text style={styles.title}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View>
        <View style={[styles.row]}>
          <View style={[styles.row, styles.orderBookHeader]}>
            <Text style={styles.subtitle}>TOTAL</Text>
            <Text style={styles.subtitle}>PRICE</Text>
          </View>
          <View style={[styles.row, styles.orderBookHeader]}>
            <Text style={styles.subtitle}>PRICE</Text>
            <Text style={styles.subtitle}>TOTAL</Text>
          </View>
        </View>
        <ScrollView>
          <View style={styles.row}>
            <FlatList
              scrollEnabled={false}
              renderItem={renderItemInverse}
              data={bids}
              keyExtractor={(elem) => elem[0]}
            />
            <FlatList
              scrollEnabled={false}
              renderItem={renderItem}
              data={asks}
              keyExtractor={(elem) => elem[0]}
            />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1b262d",
    padding: 20,
  },
  titleContainer: {
    marginVertical: 10,
    marginHorizontal: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontWeight: "bold",
    color: "white",
    fontSize: 16,
  },
  subtitle: {
    color: "gray",
    fontSize: 15,
  },
  row: {
    flexDirection: "row",
  },
  orderContainer: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    borderBottomWidth: 2,
    borderColor: "black",
    paddingVertical: 4,
  },
  orderBookHeader: {
    flex: 1,
    paddingHorizontal: 15,
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderColor: "black",
    borderTopWidth: 2,
    borderTopColor: "#555555",
    paddingVertical: 4,
  },
  order: {
    color: "white",
    fontSize: 15,
  },
  asksProgressBar: {
    position: "absolute",
    top: 0,
    height: 30,
    backgroundColor: "#4d2f33",
  },
  bidsProgressBarContainer: {
    position: "absolute",
    top: 0,
    width: width / 2,
    justifyContent: "flex-end",
    alignItems: "flex-end",
  },
  bidsProgressBar: {
    height: 30,
    backgroundColor: "#154f49",
  },
  btn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
    backgroundColor: "#154f49",
    marginRight: 10,
  },
});

export default App;
