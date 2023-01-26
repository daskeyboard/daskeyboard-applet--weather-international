const assert = require('assert');
const t = require('../index');
const forecastUrl = 'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=42.50779&lon=1.52109';
const cityName = 'Austin, Texas (USA)';
const maxResults = 1000;

describe('loadCities', function () {
  it('returns an array of lines', async function () {
    this.timeout(1000);
    return t.loadCities().then(lines => {
      assert.ok(lines);
      assert(lines.length > 1000);
    });
  });
});

describe('processCities', function () {
  it('processes the cities', async function () {
    this.timeout(1000);
    return t.loadCities().then(lines => {
      const options = t.processCities(lines);
      assert.ok(options);
      assert(options.length > 1000);
      assert.strictEqual('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=42.50779&lon=1.52109', options[0].key);
      assert.strictEqual('Andorra la Vella, Andorra la Vella (Andorra)', options[0].value);
    });
  });
});

describe('retrieveForecast', function () {
  it('retrieves a forecast', async function () {
    return t.retrieveForecast(forecastUrl).then(data => {
      assert.ok(data);
      assert.ok(data.properties);
      assert(Array.isArray(data.properties.timeseries));
      assert.ok(data.properties.timeseries[0]);
      assert.ok(data.properties.timeseries[0].time);
      assert.ok(data.properties.timeseries[0].data);
    })
  })
})

const testPeriodJson = {
  'time': '2022-11-04T16:00:00Z',
  'data': {
    'instant': {
      'details': {
        'air_pressure_at_sea_level': 1010.4,
        'air_temperature': 10.5,
        'cloud_area_fraction': 37.5,
        'relative_humidity': 69.6,
        'wind_from_direction': 326.7,
        'wind_speed': 2.7
      }
    },
    'next_12_hours': {
      'summary': {
        'symbol_code': 'fair_night'
      }
    },
    'next_1_hours': {
      'summary': {
        'symbol_code': 'fair_night'
      },
      'details': {
        'precipitation_amount': 0
      }
    },
    'next_6_hours': {
      'summary': {
        'symbol_code': 'fair_night'
      },
      'details': {
        'precipitation_amount': 0.1
      }
    }
  }
}


describe('Period', function () {
  it('revive(json)', function () {
    const period = t.Period.revive(testPeriodJson);
    assert.ok(period);
    assert.ok(period.from);
    assert.ok(period.symbol);
    assert.ok(period.precipitation !== undefined);
    assert.ok(period.temperature !== undefined);
  })
});

describe('processForecast', function () {
  it('processes a forecast JSON', async function () {
    return t.retrieveForecast(forecastUrl).then(data => {
      const days = t.processForecast(data);
      assert.ok(days);
      assert(days.length > 1);
      for (day of days) {
        assert(day instanceof t.Day);
        assert(day.date);
        assert(day.periods);
        assert(day.periods.length);
      }
    });
  });
});

describe('chooseColor', function () {
  it('picks snow', function () {
    assert.equal(t.Colors.SNOW, t.chooseColor(new t.Period({
      symbol: 'Snow'
    })));
  });
  it('picks storm', function () {
    assert.equal(t.Colors.STORM, t.chooseColor(new t.Period({
      symbol: 'Stormy and Windy'
    })));
  });
  it('picks rain', function () {
    assert.equal(t.Colors.SHOWER, t.chooseColor(new t.Period({
      symbol: 'Rain'
    })));
  });
  it('picks clouds', function () {
    assert.equal(t.Colors.CLOUDY, t.chooseColor(new t.Period({
      symbol: 'Cloudy and warm'
    })));
  });
  it('picks clear', function () {
    assert.equal(t.Colors.CLEAR, t.chooseColor(new t.Period({
      symbol: 'Clear'
    })));
  });
});


describe('choosePeriod', function () {
  it('picks the only period', function () {
    const period = {
      from: new Date('2022-11-04T16:00:00.000'),
      number: 8,
      symbol: 'fair_night',
      precipitation: 0,
      windDirection: 326.7,
      windSpeed: 2.7,
      temperature: 10.5,
      pressure: 1010.4
    };
    const day = new t.Day('foo', [period]);
    const test = t.choosePeriod(day);
    assert.ok(test);
    assert.strictEqual(period.from, test.from)
  });

  it('picks the rainiest of three periods', function () {
    const period1 = {
      from: new Date('2022-11-04T12:00:00.000'),
      number: 8,
      symbol: 'fair_night',
      precipitation: 2.4,
      windDirection: 326.7,
      windSpeed: 2.7,
      temperature: 10.5,
      pressure: 1010.4
    };
    const period2 = {
      from: new Date('2022-11-04T13:00:00.000'),
      number: 9,
      symbol: 'fair_night',
      precipitation: 4.4,
      windDirection: 326.7,
      windSpeed: 2.7,
      temperature: 10.5,
      pressure: 1010.4
    };
    const period3 = {
      from: new Date('2022-11-04T14:00:00.000'),
      number: 10,
      symbol: 'fair_night',
      precipitation: 4.9,
      windDirection: 326.7,
      windSpeed: 2.7,
      temperature: 10.5,
      pressure: 1010.4
    };

    const day = new t.Day('foo', [period1, period2, period3]);
    const test = t.choosePeriod(day);
    assert.ok(test);
    assert.strictEqual(period2.precipitation.value, test.precipitation.value);
  });

  it('picks the rainiest of four periods', function () {
    const period1 = {
      from: new Date('2022-11-04T12:00:00.000'),
      number: 8,
      symbol: 'fair_night',
      precipitation: 1.4,
      windDirection: 326.7,
      windSpeed: 2.7,
      temperature: 10.5,
      pressure: 1010.4
    };
    const period2 = {
      from: new Date('2022-11-04T13:00:00.000'),
      number: 9,
      symbol: 'fair_night',
      precipitation: 6.4,
      windDirection: 326.7,
      windSpeed: 2.7,
      temperature: 10.5,
      pressure: 1010.4
    };
    const period3 = {
      from: new Date('2022-11-04T14:00:00.000'),
      number: 10,
      symbol: 'fair_night',
      precipitation: 4.4,
      windDirection: 326.7,
      windSpeed: 2.7,
      temperature: 10.5,
      pressure: 1010.4
    };
    const period4 = {
      from: new Date('2022-11-04T14:00:00.000'),
      number: 11,
      symbol: 'fair_night',
      precipitation: 4.9,
      windDirection: 326.7,
      windSpeed: 2.7,
      temperature: 10.5,
      pressure: 1010.4
    };

    const day = new t.Day('foo', [period1, period2, period3, period4]);
    const test = t.choosePeriod(day);
    assert.ok(test);
    assert.strictEqual(period2.precipitation.value, test.precipitation.value);
  });
});

describe('generatePeriodText', function () {
  it('generates text', function () {
    const text = t.generatePeriodText(new t.Period({
      from: new Date('2022-11-04T15:00:00.000'),
      number: 11,
      symbol: 'Cloudy',
      precipitation: 4.9,
      windDirection: 326.7,
      windSpeed: 2.7,
      temperature: 8,
      pressure: 1010.4
    }))

    console.info(text);
    assert.equal('15:00 Cloudy, 8°C', text);
  });
});


describe('WeatherForecast', function () {

  const days = [
    new t.Day(4, [
      new t.Period({
        from: new Date('2022-11-04T13:00:00.000'),
        to: new Date('2022-11-04T14:00:00.000'),
        number: 1,
        symbol: 'cloudy',
        precipitation: 0,
        windDirection: 329.3,
        windSpeed: 1.9,
        temperature: 11.6,
        pressure: 1008.3
      }),
      new t.Period({
        from: new Date('2022-11-04T14:00:00.000'),
        to: new Date('2022-11-04T15:00:00.000'),
        number: 2,
        symbol: 'cloudy',
        precipitation: 0,
        windDirection: 307.2,
        windSpeed: 2.1,
        temperature: 12.1,
        pressure: 1008.9
      }),
      new t.Period({
        from: new Date('2022-11-04T15:00:00.000'),
        to: new Date('2022-11-04T16:00:00.000'),
        number: 3,
        symbol: 'cloudy',
        precipitation: 0,
        windDirection: 326.3,
        windSpeed: 3.3,
        temperature: 11.8,
        pressure: 1009.6
      }),
      new t.Period({
        from: new Date('2022-11-04T16:00:00.000'),
        to: new Date('2022-11-04T17:00:00.000'),
        number: 4,
        symbol: 'partlycloudy_night',
        precipitation: 0,
        windDirection: 319.4,
        windSpeed: 3.4,
        temperature: 10.9,
        pressure: 1010.5
      }),
      new t.Period({
        from: new Date('2022-11-04T17:00:00.000'),
        to: new Date('2022-11-04T18:00:00.000'),
        number: 5,
        symbol: 'fair_night',
        precipitation: 0,
        windDirection: 340.8,
        windSpeed: 2.5,
        temperature: 9.9,
        pressure: 1011.3
      }),
      new t.Period({
        from: new Date('2022-11-04T18:00:00.000'),
        to: new Date('2022-11-04T19:00:00.000'),
        number: 6,
        symbol: 'partlycloudy_night',
        precipitation: 0,
        windDirection: 319.6,
        windSpeed: 2.2,
        temperature: 8.4,
        pressure: 1011.9
      }),
      new t.Period({
        from: new Date('2022-11-04T19:00:00.000'),
        to: new Date('2022-11-04T20:00:00.000'),
        number: 7,
        symbol: 'partlycloudy_night',
        precipitation: 0,
        windDirection: 288.4,
        windSpeed: 2.5,
        temperature: 8.8,
        pressure: 1012.7
      }),
      new t.Period({
        from: new Date('2022-11-04T20:00:00.000'),
        to: new Date('2022-11-04T21:00:00.000'),
        number: 8,
        symbol: 'partlycloudy_night',
        precipitation: 0,
        windDirection: 300.7,
        windSpeed: 3,
        temperature: 9,
        pressure: 1013.4
      }),
      new t.Period({
        from: new Date('2022-11-04T21:00:00.000'),
        to: new Date('2022-11-04T22:00:00.000'),
        number: 9,
        symbol: 'rainshowers_night',
        precipitation: 0.6,
        windDirection: 276.4,
        windSpeed: 2.2,
        temperature: 8.3,
        pressure: 1013.7
      }),
      new t.Period({
        from: new Date('2022-11-04T22:00:00.000'),
        to: new Date('2022-11-04T23:00:00.000'),
        number: 10,
        symbol: 'partlycloudy_night',
        precipitation: 0,
        windDirection: 270.6,
        windSpeed: 1.9,
        temperature: 7.8,
        pressure: 1014.5
      })
    ]),
    new t.Day(5, [
      new t.Period({
        from: new Date('2022-11-04T23:00:00.000'),
        to: new Date('2022-11-05T00:00:00.000'),
        number: 11,
        symbol: 'fair_night',
        precipitation: 0,
        windDirection: 250.4,
        windSpeed: 2,
        temperature: 7.9,
        pressure: 1014.5
      }),
      new t.Period({
        from: new Date('2022-11-05T00:00:00.000'),
        to: new Date('2022-11-05T01:00:00.000'),
        number: 12,
        symbol: 'fair_night',
        precipitation: 0,
        windDirection: 253.9,
        windSpeed: 2,
        temperature: 7.6,
        pressure: 1014.6
      }),
      new t.Period({
        from: new Date('2022-11-05T01:00:00.000'),
        to: new Date('2022-11-05T02:00:00.000'),
        number: 13,
        symbol: 'clearsky_night',
        precipitation: 0,
        windDirection: 240.7,
        windSpeed: 2.1,
        temperature: 7.1,
        pressure: 1014.7
      }),
      new t.Period({
        from: new Date('2022-11-05T02:00:00.000'),
        to: new Date('2022-11-05T03:00:00.000'),
        number: 14,
        symbol: 'fair_night',
        precipitation: 0,
        windDirection: 221.4,
        windSpeed: 2.2,
        temperature: 6.7,
        pressure: 1014.8
      }),
      new t.Period({
        from: new Date('2022-11-05T03:00:00.000'),
        to: new Date('2022-11-05T04:00:00.000'),
        number: 15,
        symbol: 'partlycloudy_night',
        precipitation: 0,
        windDirection: 221.6,
        windSpeed: 2.6,
        temperature: 7.2,
        pressure: 1014.8
      }),
      new t.Period({
        from: new Date('2022-11-05T04:00:00.000'),
        to: new Date('2022-11-05T05:00:00.000'),
        number: 16,
        symbol: 'partlycloudy_night',
        precipitation: 0,
        windDirection: 242.5,
        windSpeed: 3.5,
        temperature: 8.2,
        pressure: 1015.1
      }),
      new t.Period({
        from: new Date('2022-11-05T05:00:00.000'),
        to: new Date('2022-11-05T06:00:00.000'),
        number: 17,
        symbol: 'partlycloudy_night',
        precipitation: 0,
        windDirection: 237.9,
        windSpeed: 3.9,
        temperature: 8.4,
        pressure: 1015.3
      }),
      new t.Period({
        from: new Date('2022-11-05T06:00:00.000'),
        to: new Date('2022-11-05T07:00:00.000'),
        number: 18,
        symbol: 'fair_night',
        precipitation: 0,
        windDirection: 229.4,
        windSpeed: 3.4,
        temperature: 8.6,
        pressure: 1015.2
      }),
      new t.Period({
        from: new Date('2022-11-05T07:00:00.000'),
        to: new Date('2022-11-05T08:00:00.000'),
        number: 19,
        symbol: 'partlycloudy_day',
        precipitation: 0,
        windDirection: 237.6,
        windSpeed: 3.5,
        temperature: 8.7,
        pressure: 1015.5
      }),
      new t.Period({
        from: new Date('2022-11-05T08:00:00.000'),
        to: new Date('2022-11-05T09:00:00.000'),
        number: 20,
        symbol: 'fair_day',
        precipitation: 0,
        windDirection: 234.8,
        windSpeed: 4.1,
        temperature: 9.8,
        pressure: 1015.7
      }),
      new t.Period({
        from: new Date('2022-11-05T09:00:00.000'),
        to: new Date('2022-11-05T10:00:00.000'),
        number: 21,
        symbol: 'fair_day',
        precipitation: 0,
        windDirection: 234.8,
        windSpeed: 4.9,
        temperature: 10.8,
        pressure: 1015.8
      }),
      new t.Period({
        from: new Date('2022-11-05T10:00:00.000'),
        to: new Date('2022-11-05T11:00:00.000'),
        number: 22,
        symbol: 'partlycloudy_day',
        precipitation: 0,
        windDirection: 244,
        windSpeed: 5.8,
        temperature: 11.8,
        pressure: 1015.6
      }),
      new t.Period({
        from: new Date('2022-11-05T11:00:00.000'),
        to: new Date('2022-11-05T12:00:00.000'),
        number: 23,
        symbol: 'cloudy',
        precipitation: 0,
        windDirection: 229.6,
        windSpeed: 5.4,
        temperature: 12.2,
        pressure: 1015.7
      }),
      new t.Period({
        from: new Date('2022-11-05T12:00:00.000'),
        to: new Date('2022-11-05T13:00:00.000'),
        number: 24,
        symbol: 'cloudy',
        precipitation: 0,
        windDirection: 228.4,
        windSpeed: 5.7,
        temperature: 12.1,
        pressure: 1015.7
      }),
      new t.Period({
        from: new Date('2022-11-05T13:00:00.000'),
        to: new Date('2022-11-05T14:00:00.000'),
        number: 25,
        symbol: 'cloudy',
        precipitation: 0,
        windDirection: 224,
        windSpeed: 5.8,
        temperature: 12,
        pressure: 1015.6
      }),
      new t.Period({
        from: new Date('2022-11-05T14:00:00.000'),
        to: new Date('2022-11-05T15:00:00.000'),
        number: 26,
        symbol: 'cloudy',
        precipitation: 0,
        windDirection: 225.4,
        windSpeed: 5.5,
        temperature: 12.1,
        pressure: 1015.3
      }),
      new t.Period({
        from: new Date('2022-11-05T15:00:00.000'),
        to: new Date('2022-11-05T16:00:00.000'),
        number: 27,
        symbol: 'cloudy',
        precipitation: 0,
        windDirection: 206.3,
        windSpeed: 5,
        temperature: 11.6,
        pressure: 1014.9
      }),
      new t.Period({
        from: new Date('2022-11-05T16:00:00.000'),
        to: new Date('2022-11-05T17:00:00.000'),
        number: 28,
        symbol: 'rain',
        precipitation: 0.3,
        windDirection: 202.1,
        windSpeed: 5,
        temperature: 10.8,
        pressure: 1014.6
      }),
      new t.Period({
        from: new Date('2022-11-05T17:00:00.000'),
        to: new Date('2022-11-05T18:00:00.000'),
        number: 29,
        symbol: 'cloudy',
        precipitation: 0,
        windDirection: 201.5,
        windSpeed: 5.6,
        temperature: 10.7,
        pressure: 1014.5
      }),
      new t.Period({
        from: new Date('2022-11-05T18:00:00.000'),
        to: new Date('2022-11-05T19:00:00.000'),
        number: 30,
        symbol: 'cloudy',
        precipitation: 0,
        windDirection: 199.7,
        windSpeed: 6.1,
        temperature: 10.4,
        pressure: 1014.2
      }),
      new t.Period({
        from: new Date('2022-11-05T19:00:00.000'),
        to: new Date('2022-11-05T20:00:00.000'),
        number: 31,
        symbol: 'cloudy',
        precipitation: 0,
        windDirection: 197.9,
        windSpeed: 6.3,
        temperature: 10.5,
        pressure: 1014.2
      }),
      new t.Period({
        from: new Date('2022-11-05T20:00:00.000'),
        to: new Date('2022-11-05T21:00:00.000'),
        number: 32,
        symbol: 'cloudy',
        precipitation: 0,
        windDirection: 195.4,
        windSpeed: 6.8,
        temperature: 10.5,
        pressure: 1013.9
      }),
      new t.Period({
        from: new Date('2022-11-05T21:00:00.000'),
        to: new Date('2022-11-05T22:00:00.000'),
        number: 33,
        symbol: 'cloudy',
        precipitation: 0,
        windDirection: 196.8,
        windSpeed: 7.1,
        temperature: 10.4,
        pressure: 1013.8
      }),
      new t.Period({
        from: new Date('2022-11-05T22:00:00.000'),
        to: new Date('2022-11-05T23:00:00.000'),
        number: 34,
        symbol: 'cloudy',
        precipitation: 0,
        windDirection: 198,
        windSpeed: 7.2,
        temperature: 10.4,
        pressure: 1013.5
      })
    ]),
    new t.Day(6, [
      new t.Period({
        from: new Date('2022-11-05T23:00:00.000'),
        to: new Date('2022-11-06T00:00:00.000'),
        number: 35,
        symbol: 'cloudy',
        precipitation: 0,
        windDirection: 198.2,
        windSpeed: 7.1,
        temperature: 10.3,
        pressure: 1013.1
      }),
      new t.Period({
        from: new Date('2022-11-06T00:00:00.000'),
        to: new Date('2022-11-06T01:00:00.000'),
        number: 36,
        symbol: 'partlycloudy_night',
        precipitation: 0,
        windDirection: 197,
        windSpeed: 7.2,
        temperature: 10.3,
        pressure: 1012.6
      }),
      new t.Period({
        from: new Date('2022-11-06T01:00:00.000'),
        to: new Date('2022-11-06T02:00:00.000'),
        number: 37,
        symbol: 'cloudy',
        precipitation: 0,
        windDirection: 197.4,
        windSpeed: 7.2,
        temperature: 10.2,
        pressure: 1012.1
      }),
      new t.Period({
        from: new Date('2022-11-06T02:00:00.000'),
        to: new Date('2022-11-06T03:00:00.000'),
        number: 38,
        symbol: 'cloudy',
        precipitation: 0,
        windDirection: 195.5,
        windSpeed: 7.2,
        temperature: 10.1,
        pressure: 1011.7
      }),
      new t.Period({
        from: new Date('2022-11-06T03:00:00.000'),
        to: new Date('2022-11-06T04:00:00.000'),
        number: 39,
        symbol: 'partlycloudy_night',
        precipitation: 0,
        windDirection: 194.8,
        windSpeed: 6.8,
        temperature: 10.2,
        pressure: 1011
      }),
      new t.Period({
        from: new Date('2022-11-06T04:00:00.000'),
        to: new Date('2022-11-06T05:00:00.000'),
        number: 40,
        symbol: 'cloudy',
        precipitation: 0,
        windDirection: 193.4,
        windSpeed: 6.5,
        temperature: 10.2,
        pressure: 1010.4
      }),
      new t.Period({
        from: new Date('2022-11-06T05:00:00.000'),
        to: new Date('2022-11-06T06:00:00.000'),
        number: 41,
        symbol: 'cloudy',
        precipitation: 0,
        windDirection: 191.5,
        windSpeed: 6.7,
        temperature: 10.7,
        pressure: 1009.7
      }),
      new t.Period({
        from: new Date('2022-11-06T06:00:00.000'),
        to: new Date('2022-11-06T07:00:00.000'),
        number: 42,
        symbol: 'lightrain',
        precipitation: 0.1,
        windDirection: 191.8,
        windSpeed: 6.8,
        temperature: 10.6,
        pressure: 1009.3
      }),
      new t.Period({
        from: new Date('2022-11-06T07:00:00.000'),
        to: new Date('2022-11-06T08:00:00.000'),
        number: 43,
        symbol: 'cloudy',
        precipitation: 0,
        windDirection: 189.6,
        windSpeed: 6.8,
        temperature: 10.5,
        pressure: 1009
      }),
      new t.Period({
        from: new Date('2022-11-06T08:00:00.000'),
        to: new Date('2022-11-06T09:00:00.000'),
        number: 44,
        symbol: 'rain',
        precipitation: 0.3,
        windDirection: 189.4,
        windSpeed: 7,
        temperature: 10.9,
        pressure: 1008.7
      }),
      new t.Period({
        from: new Date('2022-11-06T09:00:00.000'),
        to: new Date('2022-11-06T10:00:00.000'),
        number: 45,
        symbol: 'heavyrain',
        precipitation: 1.6,
        windDirection: 188.4,
        windSpeed: 6.7,
        temperature: 11.1,
        pressure: 1008
      }),
      new t.Period({
        from: new Date('2022-11-06T10:00:00.000'),
        to: new Date('2022-11-06T11:00:00.000'),
        number: 46,
        symbol: 'heavyrain',
        precipitation: 2.2,
        windDirection: 190.1,
        windSpeed: 6.8,
        temperature: 10.7,
        pressure: 1007.7
      }),
      new t.Period({
        from: new Date('2022-11-06T11:00:00.000'),
        to: new Date('2022-11-06T12:00:00.000'),
        number: 47,
        symbol: 'heavyrain',
        precipitation: 3.1,
        windDirection: 188.3,
        windSpeed: 7.2,
        temperature: 10.6,
        pressure: 1007.1
      }),
      new t.Period({
        from: new Date('2022-11-06T12:00:00.000'),
        to: new Date('2022-11-06T13:00:00.000'),
        number: 48,
        symbol: 'heavyrain',
        precipitation: 2.7,
        windDirection: 186.8,
        windSpeed: 7.1,
        temperature: 10.6,
        pressure: 1005.9
      }),
      new t.Period({
        from: new Date('2022-11-06T13:00:00.000'),
        to: new Date('2022-11-06T14:00:00.000'),
        number: 49,
        symbol: 'heavyrain',
        precipitation: 2.3,
        windDirection: 186.3,
        windSpeed: 7.6,
        temperature: 10.5,
        pressure: 1005.1
      }),
      new t.Period({
        from: new Date('2022-11-06T14:00:00.000'),
        to: new Date('2022-11-06T15:00:00.000'),
        number: 50,
        symbol: 'rain',
        precipitation: 0.6,
        windDirection: 183.2,
        windSpeed: 7.7,
        temperature: 10.2,
        pressure: 1004.1
      }),
      new t.Period({
        from: new Date('2022-11-06T15:00:00.000'),
        to: new Date('2022-11-06T16:00:00.000'),
        number: 51,
        symbol: 'rain',
        precipitation: 0.5,
        windDirection: 186.7,
        windSpeed: 8.2,
        temperature: 10.2,
        pressure: 1003.4
      }),
      new t.Period({
        from: new Date('2022-11-06T16:00:00.000'),
        to: new Date('2022-11-06T17:00:00.000'),
        number: 52,
        symbol: 'rain',
        precipitation: 0.3,
        windDirection: 189.9,
        windSpeed: 8.3,
        temperature: 10.2,
        pressure: 1003.1
      }),
      new t.Period({
        from: new Date('2022-11-06T17:00:00.000'),
        to: new Date('2022-11-06T18:00:00.000'),
        number: 53,
        symbol: 'lightrain',
        precipitation: 0.2,
        windDirection: 195.7,
        windSpeed: 8.5,
        temperature: 10.5,
        pressure: 1002.8
      }),
      new t.Period({
        from: new Date('2022-11-06T18:00:00.000'),
        to: new Date('2022-11-06T19:00:00.000'),
        number: 54,
        symbol: 'cloudy',
        precipitation: 0,
        windDirection: 202.3,
        windSpeed: 8.7,
        temperature: 10.7,
        pressure: 1002.8
      }),
      new t.Period({
        from: new Date('2022-11-06T19:00:00.000'),
        to: new Date('2022-11-06T20:00:00.000'),
        number: 55,
        symbol: 'partlycloudy_night',
        precipitation: 0,
        windDirection: 218.4,
        windSpeed: 8.4,
        temperature: 11.5,
        pressure: 1003.3
      }),
      new t.Period({
        from: new Date('2022-11-06T20:00:00.000'),
        to: new Date('2022-11-06T21:00:00.000'),
        number: 56,
        symbol: 'partlycloudy_night',
        precipitation: 0,
        windDirection: 229.5,
        windSpeed: 8.2,
        temperature: 11.4,
        pressure: 1004.1
      }),
      new t.Period({
        from: new Date('2022-11-06T21:00:00.000'),
        to: new Date('2022-11-06T22:00:00.000'),
        number: 57,
        symbol: 'cloudy',
        precipitation: 0,
        windDirection: 220.2,
        windSpeed: 7.5,
        temperature: 11.3,
        pressure: 1004.5
      }),
      new t.Period({
        from: new Date('2022-11-06T22:00:00.000'),
        to: new Date('2022-11-06T23:00:00.000'),
        number: 58,
        symbol: 'partlycloudy_night',
        precipitation: 0,
        windDirection: 224.7,
        windSpeed: 8.4,
        temperature: 11.1,
        pressure: 1005.3
      })
    ]),
    new t.Day(7, [
      new t.Period({
        from: new Date('2022-11-06T23:00:00.000'),
        to: new Date('2022-11-07T00:00:00.000'),
        number: 59,
        symbol: 'partlycloudy_night',
        precipitation: 0,
        windDirection: 225.9,
        windSpeed: 8.3,
        temperature: 11.4,
        pressure: 1005.9
      }),
      new t.Period({
        from: new Date('2022-11-07T00:00:00.000'),
        to: new Date('2022-11-07T01:00:00.000'),
        number: 60,
        symbol: 'lightrainshowers_night',
        precipitation: 0.1,
        windDirection: 226.4,
        windSpeed: 8.1,
        temperature: 11.3,
        pressure: 1006.4
      }),
      new t.Period({
        from: new Date('2022-11-07T01:00:00.000'),
        to: new Date('2022-11-07T02:00:00.000'),
        number: 61,
        symbol: 'cloudy',
        precipitation: 0,
        windDirection: 226.1,
        windSpeed: 8.1,
        temperature: 11.3,
        pressure: 1006.8
      }),
      new t.Period({
        from: new Date('2022-11-07T02:00:00.000'),
        to: new Date('2022-11-07T03:00:00.000'),
        number: 62,
        symbol: 'partlycloudy_night',
        precipitation: 0,
        windDirection: 220.9,
        windSpeed: 7.7,
        temperature: 11.3,
        pressure: 1007
      }),
      new t.Period({
        from: new Date('2022-11-07T03:00:00.000'),
        to: new Date('2022-11-07T04:00:00.000'),
        number: 63,
        symbol: 'lightrain',
        precipitation: 0.2,
        windDirection: 218.5,
        windSpeed: 7.4,
        temperature: 11.1,
        pressure: 1007.1
      }),
      new t.Period({
        from: new Date('2022-11-07T04:00:00.000'),
        to: new Date('2022-11-07T05:00:00.000'),
        number: 64,
        symbol: 'rain',
        precipitation: 0.3,
        windDirection: 214.9,
        windSpeed: 7,
        temperature: 11.1,
        pressure: 1007.2
      }),
      new t.Period({
        from: new Date('2022-11-07T05:00:00.000'),
        to: new Date('2022-11-07T06:00:00.000'),
        number: 65,
        symbol: 'rain',
        precipitation: 0.9,
        windDirection: 213.8,
        windSpeed: 7.7,
        temperature: 11.3,
        pressure: 1007.4
      }),
      new t.Period({
        from: new Date('2022-11-07T06:00:00.000'),
        to: new Date('2022-11-07T07:00:00.000'),
        number: 66,
        symbol: 'cloudy',
        precipitation: 0.2,
        windDirection: 211.7,
        windSpeed: 7.4,
        temperature: 11.2,
        pressure: 1007.8
      }),
      new t.Period({
        from: new Date('2022-11-07T12:00:00.000'),
        to: new Date('2022-11-07T13:00:00.000'),
        number: 67,
        symbol: 'cloudy',
        precipitation: 0,
        windDirection: 212.5,
        windSpeed: 7,
        temperature: 14.3,
        pressure: 1009.9
      }),
      new t.Period({
        from: new Date('2022-11-07T18:00:00.000'),
        to: new Date('2022-11-07T19:00:00.000'),
        number: 68,
        symbol: 'cloudy',
        precipitation: 0,
        windDirection: 192.6,
        windSpeed: 6.5,
        temperature: 14.3,
        pressure: 1011
      })
    ]),
    new t.Day(8, [
      new t.Period({
        from: new Date('2022-11-08T00:00:00.000'),
        to: new Date('2022-11-08T01:00:00.000'),
        number: 69,
        symbol: 'cloudy',
        precipitation: 0,
        windDirection: 183,
        windSpeed: 5.9,
        temperature: 11.7,
        pressure: 1008.8
      }),
      new t.Period({
        from: new Date('2022-11-08T06:00:00.000'),
        to: new Date('2022-11-08T07:00:00.000'),
        number: 70,
        symbol: 'cloudy',
        precipitation: 0.4,
        windDirection: 176.4,
        windSpeed: 6.9,
        temperature: 13.4,
        pressure: 1003.5
      }),
      new t.Period({
        from: new Date('2022-11-08T12:00:00.000'),
        to: new Date('2022-11-08T13:00:00.000'),
        number: 71,
        symbol: 'lightrain',
        precipitation: 0.6,
        windDirection: 220,
        windSpeed: 9.2,
        temperature: 16,
        pressure: 1003.4
      }),
      new t.Period({
        from: new Date('2022-11-08T18:00:00.000'),
        to: new Date('2022-11-08T19:00:00.000'),
        number: 72,
        symbol: 'cloudy',
        precipitation: 0,
        windDirection: 220.1,
        windSpeed: 5,
        temperature: 13.3,
        pressure: 1005.9
      })
    ])
  ];

  it('#generateSignal(days)', function () {
    const app = buildApp();
    const signal = app.generateSignal(days);
    assert(signal);
    assert(signal.name.includes(cityName));
    assert(signal.message.includes("<strong>4:</strong>"));
    assert(signal.message.includes("14:00 cloudy, 12.1°C"));
    assert(signal.message.includes("17:00 fair_night, 9.9°C"));
    assert(signal.message.includes("20:00 partlycloudy_night, 9°C"));
    assert(signal.message.includes("22:00 partlycloudy_night, 7.8°C"));
  });

  it('#generateSignal(days) with imperial units', function () {
    const app = buildApp();
    app.config.units = t.Units.imperial;
    const signal = app.generateSignal(days);
    assert(signal);
    assert(signal.name.includes(cityName));
    assert(signal.message.includes("<strong>4:</strong>"));
    assert(signal.message.includes("14:00 cloudy, 54°F"));
    assert(signal.message.includes("17:00 fair_night, 50°F"));
    assert(signal.message.includes("20:00 partlycloudy_night, 48°F"));
    assert(signal.message.includes("22:00 partlycloudy_night, 46°F"));
  });

  describe('options', function () {
    const app = buildApp();
    it('retrieves a full set of options', function () {
      return app.options('cityId').then(options => {
        assert.ok(options);
        assert.ok(options.length);
        assert.equal(maxResults, options.length);
      })
    });

    it('ignores whitespace search', function () {
      return app.options('cityId', '  ').then(options => {
        assert.ok(options);
        assert.ok(options.length);
        assert.equal(maxResults, options.length);
      })
    });

    it('returns 20 results on vague search', function () {
      return app.options('cityId', 'a').then(options => {
        assert.ok(options);
        assert.ok(options.length);
        assert.equal(maxResults, options.length);
      })
    });

    it('returns results matching the search', function () {
      return app.options('cityId', 'texas').then(options => {
        assert.ok(options);
        assert.ok(options.length);
        assert.equal(5, options.length);
      })
    });

    it('returns results matching the search', function () {
      return app.options('cityId', 'austin').then(options => {
        assert.ok(options);
        assert.ok(options.length);
        assert.equal(1, options.length);
        assert.equal('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=30.26715&lon=-97.74306', options[0].key);
      })
    });

    it('filters underscores', async function () {
      return app.options('cityId', 'casablanca').then(options => {
        console.log(JSON.stringify(options));
        assert.equal(5, options.length);
        assert.equal('Casablanca, Grand Casablanca (Morocco)', options[0].value);
      })
    });
  })


  it('#run()', async function () {
    const app = buildApp();
    return app.run().then((signal) => {
      assert.ok(signal);
      assert(signal.name.includes(cityName));
    });
  });

  it('#options()', async function () {
    const app = buildApp();
    this.timeout(1000);
    return app.options('zoneId').then(options => {
      assert.ok(options);
      assert(options.length > 1, 'Selections did not have an array of values.');
      const option = options[0];
      assert.ok(option.key);
      assert.ok(option.value);
      assert(option.key.toLowerCase().includes('lat=42.50779&lon=1.52109'));
      assert(option.key.toLowerCase().includes('locationforecast/2.0/compact'));
      assert(option.value.toLowerCase().includes('vella'));
    })
  })
})

function buildApp() {
  const app = new t.WeatherForecast();
  app.config = {
    cityId: forecastUrl,
    cityId_LABEL: cityName,
    units: t.Units.metric,
    geometry: {
      width: 4,
      height: 1,
    }
  };

  return app;
}