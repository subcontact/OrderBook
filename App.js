import React, { useState, useEffect } from "react";
import { Button, FlatList, LogBox, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

const URL = "wss://api-pub.bitfinex.com/ws/2/";

const formatNum = (num) => Math.round(num * 100) / 100;

LogBox.ignoreLogs([
  'VirtualizedLists should never be nested',
]);

const App = () => {
  const [connect, setConnect] = useState(true);
  const [bids, setBids] = useState([]);
  const [asks, setAsks] = useState([]);
  const [bidsObj, setBidsObj] = useState({});
  const [asksObj, setAsksObj] = useState({});

  useEffect(() => {
    if (!connect) return
    const ws = new WebSocket(URL);
    try {
      ws.onopen = () => {
        console.log("open");
        ws.send(
          JSON.stringify({
            event: "subscribe",
            channel: "book",
            symbol: "tBTCUSD",
            frequency: "F1",
          })
        );
      };

      ws.onmessage = (e) => {
        try {
          const message = JSON.parse(e.data);
          const [price, _, amount] = message[1];
          if (!price || !amount) return;
          const formattedPrice = formatNum(price);
          const formattedAmount = amount.toFixed(3);
          if (isNaN(formattedPrice) || isNaN(formattedAmount)) return;
          if (amount === 0) {
            if (bidsObj[amount]) {
              setBidsObj(prevState => {
                const newState = { ...prevState }
                delete [formattedAmount]
                return newState;
              })
            }
            if (asksObj[amount]) {
              setAsksObj(prevState => {
                const newState = { ...prevState }
                delete [formattedAmount]
                return newState;
              })
            }
          }
          if (amount > 0) {
            if (bids.length < 50)
              setBidsObj((prevState) => ({
                ...prevState,
                [formattedPrice]: formattedAmount,
              }));
          } else {
            if (asks.length < 50)
              setAsksObj((prevState) => ({
                ...prevState,
                [formattedPrice]: formattedAmount,
              }));
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
    };
  }, [connect]);

  useEffect(() => {
    const val = Object.entries(asksObj) || [];
    setAsks(val);
  }, [asksObj]);

  useEffect(() => {
    const val = Object.entries(bidsObj) || [];
    setBids(val.reverse());
  }, [bidsObj]);

  const renderItem = ({ item }) => (
    <View style={[styles.row, styles.orderContainer]}>
      <Text style={styles.order}>{item[0]}</Text>
      <Text style={styles.order}>{item[1]}</Text>
    </View>
  );

  const renderItemInverse = ({ item }) => (
    <View style={[styles.row, styles.orderContainer]}>
      <Text style={styles.order}>{item[1]}</Text>
      <Text style={styles.order}>{item[0]}</Text>
    </View>
  );

  const handleDisconnect = () => {
    console.log('handleDisconnect')
    setConnect(false)
  }

  const handleConnect = () => {
    console.log('handleConnect')
    setConnect(true)
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>ORDER BOOK</Text>
        <View style={styles.row}>
          <Button title="CONNECT" onPress={handleConnect} />
          <Button title="DISCONNECT" onPress={handleDisconnect} />
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
            <FlatList scrollEnabled={false} renderItem={renderItemInverse} data={bids} keyExtractor={elem => elem[0]} />
            <FlatList scrollEnabled={false} renderItem={renderItem} data={asks} keyExtractor={elem => elem[0]} />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
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
});

export default App;
