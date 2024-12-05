const App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
  hasVoted: false,

  init: async function() {
    return await App.initWeb3();
  },

  initWeb3: async function() {
    if (window.ethereum) {
      // Modern DApp browsers
      App.web3Provider = window.ethereum;
      try {
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
      } catch (error) {
        console.error("User denied account access");
      }
    } else if (window.web3) {
      // Legacy DApp browsers
      App.web3Provider = window.web3.currentProvider;
    } else {
      // Fallback to Ganache
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
    }

    window.web3 = new Web3(App.web3Provider);

    return App.initContract();
  },

  initContract: async function() {
    const electionData = await $.getJSON("Election.json");
    App.contracts.Election = new window.TruffleContract(electionData);
    App.contracts.Election.setProvider(App.web3Provider);

    App.listenForEvents();
    return App.render();
  },

  listenForEvents: async function() {
    try {
      const instance = await App.contracts.Election.deployed();
      // instance
      //   .votedEvent({}, { fromBlock: 0, toBlock: 'latest' })
      //   .on('data', (event) => {
      //     console.log("Event triggered", event);
      //     App.render();
      //   })
      //   .on('error', console.error);
    } catch (error) {
      console.error(error);
    }
  },
  render: async function() {
    const loader = $("#loader");
    const content = $("#content");
  
    loader.show();
    content.hide();
  
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      App.account = accounts[0];
      $("#accountAddress").html("Your Account: " + App.account);
  
      const instance = await App.contracts.Election.deployed();
      const candidatesCount = await instance.candidatesCount();
  
      const candidatesResults = $("#candidatesResults");
      const candidatesSelect = $("#candidatesSelect");
      candidatesResults.empty();
      candidatesSelect.empty();
  
      let totalVotes = 0;
      const candidatesData = [];
  
      // Fetch candidate data and compute totals
      for (let i = 1; i <= candidatesCount; i++) {
        const candidate = await instance.candidates(i);
        const id = candidate[0].toNumber();
        const name = candidate[1];
        const voteCount = candidate[2].toNumber();
  
        totalVotes += voteCount;
  
        candidatesData.push({ name, voteCount });
  
        const candidateTemplate = `<tr><th>${id}</th><td>${name}</td><td id=${id}>${voteCount}</td></tr>`;
        candidatesResults.append(candidateTemplate);
  
        const candidateOption = `<option value='${id}'>${name}</option>`;
        candidatesSelect.append(candidateOption);
      }
  
      // Prepare data for the chart
      const labels = candidatesData.map(candidate => candidate.name);
      const votes = candidatesData.map(candidate => candidate.voteCount);
      const percentages = candidatesData.map(candidate =>
        totalVotes > 0 ? ((candidate.voteCount / totalVotes) * 100).toFixed(2) : 0
      );
  
      // Render the Chart
      const chartCanvas = document.getElementById("resultsChart").getContext("2d");
  
      // Destroy previous chart instance (if any)
      if (App.resultsChart) {
        App.resultsChart.destroy();
      }
  
      App.resultsChart = new Chart(chartCanvas, {
        type: "bar",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Votes",
              data: votes,
              backgroundColor: "rgba(75, 192, 192, 0.6)",
              borderColor: "rgba(75, 192, 192, 1)",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  const percentage = percentages[context.dataIndex];
                  return `${context.raw} votes (${percentage}%)`;
                },
              },
            },
          },
        },
      });
  
      // Hide voting form if the user has voted
      const hasVoted = await instance.voters(App.account);
      if (hasVoted) {
        $('form').hide();
      }
    } catch (error) {
      console.warn(error);
    } finally {
      loader.hide();
      content.show();
    }
  },
  
  // render: async function() {
  //   const loader = $("#loader");
  //   const content = $("#content");

  //   loader.show();
  //   content.hide();

  //   try {
  //     const accounts = await window.ethereum.request({ method: 'eth_accounts' });
  //     App.account = accounts[0];
  //     $("#accountAddress").html("Your Account: " + App.account);

  //     const instance = await App.contracts.Election.deployed();
  //     const candidatesCount = await instance.candidatesCount();

  //     const candidatesResults = $("#candidatesResults");
  //     const candidatesSelect = $("#candidatesSelect");
  //     candidatesResults.empty();
  //     candidatesSelect.empty();

  //     for (let i = 1; i <= candidatesCount; i++) {
  //       const candidate = await instance.candidates(i);
  //       const id = candidate[0].toNumber();
  //       const name = candidate[1];
  //       const voteCount = candidate[2].toNumber();

  //       const candidateTemplate = `<tr><th>${id}</th><td>${name}</td><td id=${id}>${voteCount}</td></tr>`;
  //       candidatesResults.append(candidateTemplate);

  //       const candidateOption = `<option value='${id}'>${name}</option>`;
  //       candidatesSelect.append(candidateOption);
  //     }

  //     const hasVoted = await instance.voters(App.account);
  //     if (hasVoted) {
  //       $('form').hide();
  //     }
  //   } catch (error) {
  //     console.warn(error);
  //   } finally {
  //     loader.hide();
  //     content.show();
  //   }
  // },

  castVote: async function() {
    const candidateId = $('#candidatesSelect').val();
    try {
      const instance = await App.contracts.Election.deployed();
      await instance.vote(candidateId, { from: App.account });
      $("#content").hide();
      $("#loader").show();
      App.render();
    } catch (error) {
      console.error(error);
      App.render();
    }
  }
};

$(function() {
  $(window).on('load', function() {
    App.init();
  });
});
